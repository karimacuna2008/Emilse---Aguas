-- 009_p2_tienda.sql
-- P2 (tienda/cliente): fecha de entrega, configuración (app_settings) y RPCs de cliente.
-- Idempotente donde es posible. Aplicar vía Supabase Management API.

-- ── Esquema: fecha de entrega obligatoria ──────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
-- Backfill de filas viejas antes del NOT NULL (riesgo: spec §11)
UPDATE orders SET delivery_date = created_at::date WHERE delivery_date IS NULL;
ALTER TABLE orders ALTER COLUMN delivery_date SET NOT NULL;

-- Índice para buscar_pedido_abierto / listar_pedidos_activos
CREATE INDEX IF NOT EXISTS idx_orders_phone_date_status
  ON orders(customer_phone, delivery_date, status);

-- ── Configuración editable (key-value) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el cliente arma el calendario; no hay PII)
DROP POLICY IF EXISTS "public read app_settings" ON app_settings;
CREATE POLICY "public read app_settings"
  ON app_settings FOR SELECT USING (TRUE);

-- Escritura solo admin (la UI de edición llega en P3)
DROP POLICY IF EXISTS "admin write app_settings" ON app_settings;
CREATE POLICY "admin write app_settings"
  ON app_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Seed de valores por defecto (decisiones #10, #11, #13)
INSERT INTO app_settings (key, value) VALUES
  ('order_cutoff_time',  '20:00'),
  ('cancel_cutoff_time', '06:00'),
  ('order_weekdays',     '1,2,3,4,5,6,7')   -- ISO 1=Lun..7=Dom; todos activos
ON CONFLICT (key) DO NOTHING;

-- ── crear_pedido: + p_delivery_date + validaciones (teléfono 10 díg.,
--    items no vacíos, fecha permitida). Mantiene atomicidad y recálculo. ──
DROP FUNCTION IF EXISTS crear_pedido(TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION crear_pedido(
  p_customer_name  TEXT,
  p_customer_phone TEXT,
  p_notes          TEXT,
  p_delivery_date  DATE,
  p_items          JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_id     UUID;
  v_order_number TEXT;
  v_total        DECIMAL := 0;
  v_item         JSONB;
  v_product      RECORD;
  v_phone        TEXT;
  v_cutoff_time  TEXT;
  v_weekdays     TEXT;
  v_dow          INT;
BEGIN
  -- Teléfono: exactamente 10 dígitos tras quitar no-dígitos
  v_phone := regexp_replace(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN
    RETURN jsonb_build_object('error', 'invalid_phone');
  END IF;

  -- Items no vacíos
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_items');
  END IF;

  -- Fecha permitida: día activo + antes del corte del día anterior
  IF p_delivery_date IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_date');
  END IF;
  SELECT value INTO v_cutoff_time FROM public.app_settings WHERE key = 'order_cutoff_time';
  SELECT value INTO v_weekdays    FROM public.app_settings WHERE key = 'order_weekdays';
  v_cutoff_time := COALESCE(v_cutoff_time, '20:00');
  v_weekdays    := COALESCE(v_weekdays, '1,2,3,4,5,6,7');
  v_dow := EXTRACT(ISODOW FROM p_delivery_date)::INT;   -- 1=Lun..7=Dom
  IF NOT (v_dow::text = ANY (string_to_array(v_weekdays, ','))) THEN
    RETURN jsonb_build_object('error', 'date_not_allowed');
  END IF;
  IF now() >= ((p_delivery_date - INTERVAL '1 day') + v_cutoff_time::time) THEN
    RETURN jsonb_build_object('error', 'past_cutoff');
  END IF;

  -- Validar y bloquear cada producto
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID AND active = TRUE
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'product_not_found');
    END IF;
    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object('error', 'out_of_stock', 'product_name', v_product.name);
    END IF;
    v_total := v_total + v_product.price * (v_item->>'quantity')::INT;
  END LOOP;

  v_order_number := 'EM-' || LPAD(nextval('public.order_number_seq')::TEXT, 3, '0');

  INSERT INTO public.orders
    (order_number, customer_name, customer_phone, notes, status, total, delivery_date)
  VALUES
    (v_order_number, p_customer_name, v_phone, p_notes, 'pending', v_total, p_delivery_date)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id, p.id, (v_item->>'quantity')::INT, p.price
    FROM public.products p WHERE p.id = (v_item->>'product_id')::UUID;
    UPDATE public.products SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'order_number', v_order_number, 'order_id', v_order_id);
END;
$$;

-- ── buscar_pedido_abierto: pedido pending del teléfono PARA ESA FECHA.
--    Datos mínimos + order_id (UUID no enumerable = capability token). ──
CREATE OR REPLACE FUNCTION buscar_pedido_abierto(p_phone TEXT, p_delivery_date DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_items JSONB; v_phone TEXT;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN
    RETURN jsonb_build_object('error', 'invalid_phone');
  END IF;

  SELECT id, order_number, total, delivery_date INTO v_order
  FROM public.orders
  WHERE customer_phone = v_phone AND delivery_date = p_delivery_date AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)
           ORDER BY oi.id), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'found', TRUE, 'order_id', v_order.id, 'order_number', v_order.order_number,
    'total', v_order.total, 'delivery_date', v_order.delivery_date, 'items', v_items);
END;
$$;

-- ── agregar_a_pedido: suma items a un pedido pending; fusiona líneas;
--    recalcula total y limpia total_personalizado (decisión #15). ──
CREATE OR REPLACE FUNCTION agregar_a_pedido(p_order_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_item JSONB; v_product RECORD; v_new_total DECIMAL;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error', 'order_not_pending'); END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_items');
  END IF;

  -- Bloquear + validar stock de todos los productos primero
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price, stock INTO v_product
    FROM public.products WHERE id = (v_item->>'product_id')::UUID AND active = TRUE FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'product_not_found'); END IF;
    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RETURN jsonb_build_object('error', 'out_of_stock', 'product_name', v_product.name);
    END IF;
  END LOOP;

  -- Aplicar: fusiona línea existente o inserta; descuenta stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.order_items
    SET quantity = quantity + (v_item->>'quantity')::INT
    WHERE order_id = p_order_id AND product_id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      SELECT p_order_id, p.id, (v_item->>'quantity')::INT, p.price
      FROM public.products p WHERE p.id = (v_item->>'product_id')::UUID;
    END IF;
    UPDATE public.products SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_new_total
  FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_new_total, total_personalizado = FALSE WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE, 'total', v_new_total);
END;
$$;

-- ── listar_pedidos_activos: todos los pending del teléfono (datos mínimos) ──
CREATE OR REPLACE FUNCTION listar_pedidos_activos(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_phone TEXT; v_result JSONB;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) <> 10 THEN RETURN jsonb_build_object('error', 'invalid_phone'); END IF;

  SELECT COALESCE(jsonb_agg(o ORDER BY (o->>'delivery_date')), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'order_number',  ord.order_number,
      'delivery_date', ord.delivery_date,
      'status',        ord.status,
      'total',         ord.total,
      'items', (
        SELECT COALESCE(jsonb_agg(
                 jsonb_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)
                 ORDER BY oi.id), '[]'::jsonb)
        FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = ord.id)
    ) AS o
    FROM public.orders ord
    WHERE ord.customer_phone = v_phone AND ord.status = 'pending'
  ) sub;

  RETURN jsonb_build_object('orders', v_result);
END;
$$;

-- ── cancelar_pedido_cliente: valida teléfono + corte; cancela y restaura stock ──
CREATE OR REPLACE FUNCTION cancelar_pedido_cliente(p_order_number TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_order RECORD; v_phone TEXT; v_cancel_time TEXT;
BEGIN
  v_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  SELECT id, status, customer_phone, delivery_date INTO v_order
  FROM public.orders WHERE order_number = UPPER(p_order_number) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_order.customer_phone <> v_phone THEN RETURN jsonb_build_object('error', 'phone_mismatch'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error', 'order_not_pending'); END IF;

  SELECT value INTO v_cancel_time FROM public.app_settings WHERE key = 'cancel_cutoff_time';
  v_cancel_time := COALESCE(v_cancel_time, '06:00');
  IF now() >= (v_order.delivery_date + v_cancel_time::time) THEN
    RETURN jsonb_build_object('error', 'past_cutoff');
  END IF;

  PERFORM p.id FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = v_order.id FOR UPDATE;
  UPDATE public.products p SET stock = p.stock + oi.quantity
    FROM public.order_items oi WHERE oi.order_id = v_order.id AND p.id = oi.product_id;
  UPDATE public.orders SET status = 'cancelled' WHERE id = v_order.id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ── GRANTs: RPC de cliente para anon + authenticated ──
GRANT EXECUTE ON FUNCTION crear_pedido(TEXT, TEXT, TEXT, DATE, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION buscar_pedido_abierto(TEXT, DATE)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION agregar_a_pedido(UUID, JSONB)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION listar_pedidos_activos(TEXT)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido_cliente(TEXT, TEXT)      TO anon, authenticated;
