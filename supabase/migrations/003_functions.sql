-- crear_pedido: atomic order creation with stock validation
CREATE OR REPLACE FUNCTION crear_pedido(
  p_customer_name  TEXT,
  p_customer_phone TEXT,
  p_notes          TEXT,
  p_items          JSONB  -- [{"product_id":"uuid","quantity":2}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id     UUID;
  v_order_number TEXT;
  v_total        DECIMAL := 0;
  v_item         JSONB;
  v_product      RECORD;
BEGIN
  -- Validate and lock each product row
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'product_not_found');
    END IF;

    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object(
        'error', 'out_of_stock',
        'product_name', v_product.name
      );
    END IF;

    v_total := v_total + v_product.price * (v_item->>'quantity')::INT;
  END LOOP;

  -- Generate human-readable order number
  v_order_number := 'EM-' || LPAD(nextval('order_number_seq')::TEXT, 3, '0');

  -- Insert order
  INSERT INTO orders (order_number, customer_name, customer_phone, notes, status, total)
  VALUES (v_order_number, p_customer_name, p_customer_phone, p_notes, 'pending', v_total)
  RETURNING id INTO v_order_id;

  -- Insert items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id,
           p.id,
           (v_item->>'quantity')::INT,
           p.price
    FROM products p
    WHERE p.id = (v_item->>'product_id')::UUID;

    UPDATE products
    SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      TRUE,
    'order_number', v_order_number,
    'order_id',     v_order_id
  );
END;
$$;

-- cancelar_pedido: cancel order and restore stock
CREATE OR REPLACE FUNCTION cancelar_pedido(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'order_not_pending');
  END IF;

  -- Restore stock
  UPDATE products p
  SET stock = p.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = p_order_id
    AND p.id = oi.product_id;

  -- Cancel order
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION crear_pedido    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido TO authenticated;
