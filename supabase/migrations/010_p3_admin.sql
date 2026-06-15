-- 010_p3_admin.sql
-- P3 (admin): RPCs de edición de pedidos + endurecimiento RLS.
-- Todas SECURITY DEFINER, search_path='' , nombres calificados. Aplicar vía Management API.

-- ── quitar_de_pedido: resta/elimina línea, devuelve stock, recalcula total, limpia override ──
CREATE OR REPLACE FUNCTION quitar_de_pedido(p_order_id UUID, p_product_id UUID, p_quantity INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD; v_line RECORD; v_remove INT; v_new_total DECIMAL; v_items_left INT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN jsonb_build_object('error','invalid_quantity'); END IF;
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  SELECT id, quantity INTO v_line FROM public.order_items WHERE order_id = p_order_id AND product_id = p_product_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','item_not_found'); END IF;
  PERFORM id FROM public.products WHERE id = p_product_id FOR UPDATE;
  v_remove := LEAST(p_quantity, v_line.quantity);
  IF v_remove >= v_line.quantity THEN
    DELETE FROM public.order_items WHERE id = v_line.id;
  ELSE
    UPDATE public.order_items SET quantity = quantity - v_remove WHERE id = v_line.id;
  END IF;
  UPDATE public.products SET stock = stock + v_remove WHERE id = p_product_id;
  SELECT COALESCE(SUM(quantity*unit_price),0), COUNT(*) INTO v_new_total, v_items_left
    FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_new_total, total_personalizado = FALSE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',v_new_total,'items_left',v_items_left);
END; $$;

-- ── marcar_entregado: status=delivered + delivered_at ──
CREATE OR REPLACE FUNCTION marcar_entregado(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  UPDATE public.orders SET status='delivered', delivered_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE);
END; $$;

-- ── set_total_pedido: override del total ──
CREATE OR REPLACE FUNCTION set_total_pedido(p_order_id UUID, p_total NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD;
BEGIN
  IF p_total IS NULL OR p_total < 0 THEN RETURN jsonb_build_object('error','invalid_total'); END IF;
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  UPDATE public.orders SET total = p_total, total_personalizado = TRUE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',p_total);
END; $$;

-- ── recalcular_total_pedido: volver al calculado (limpia override) ──
CREATE OR REPLACE FUNCTION recalcular_total_pedido(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order RECORD; v_total DECIMAL;
BEGIN
  SELECT id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('error','order_not_pending'); END IF;
  SELECT COALESCE(SUM(quantity*unit_price),0) INTO v_total FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders SET total = v_total, total_personalizado = FALSE WHERE id = p_order_id;
  RETURN jsonb_build_object('success',TRUE,'total',v_total);
END; $$;

-- ── RLS: quitar UPDATE directo del admin (toda escritura va por RPC) ──
DROP POLICY IF EXISTS "admin update orders" ON orders;

-- ── GRANTs (admin) ──
GRANT EXECUTE ON FUNCTION quitar_de_pedido(UUID, UUID, INT)  TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_entregado(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION set_total_pedido(UUID, NUMERIC)    TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_total_pedido(UUID)      TO authenticated;
