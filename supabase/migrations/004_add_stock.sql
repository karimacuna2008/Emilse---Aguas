CREATE OR REPLACE FUNCTION add_stock(p_product_id UUID, p_units INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products SET stock = stock + p_units WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_stock TO authenticated;
