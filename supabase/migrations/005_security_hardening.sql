-- P0 security hardening: close PII leak (#1) and bypass of crear_pedido (#2)
-- All client access to orders now goes through SECURITY DEFINER RPCs.

-- #2: remove direct public INSERT (order creation goes ONLY through crear_pedido)
DROP POLICY IF EXISTS "public create orders"      ON orders;
DROP POLICY IF EXISTS "public create order_items" ON order_items;

-- #1: remove public SELECT (anon key is public -> anyone could dump customer PII)
DROP POLICY IF EXISTS "public read orders"        ON orders;
DROP POLICY IF EXISTS "public read order_items"   ON order_items;

-- Preserve admin (authenticated) read access, previously provided by the public policies
CREATE POLICY "admin read orders"
  ON orders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admin read order_items"
  ON order_items FOR SELECT TO authenticated USING (TRUE);

-- Client order lookup by code, without exposing the table (does NOT return phone)
CREATE OR REPLACE FUNCTION consultar_pedido(p_order_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  SELECT id, order_number, customer_name, status, total, notes
  INTO v_order
  FROM public.orders
  WHERE order_number = UPPER(p_order_number);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'id',         oi.id,
             'quantity',   oi.quantity,
             'unit_price', oi.unit_price,
             'products',   jsonb_build_object('name', p.name)
           ) ORDER BY oi.id), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number',  v_order.order_number,
    'customer_name', v_order.customer_name,
    'status',        v_order.status,
    'total',         v_order.total,
    'notes',         v_order.notes,
    'order_items',   v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consultar_pedido(TEXT) TO anon, authenticated;
