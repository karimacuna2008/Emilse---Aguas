-- Enable RLS on all tables
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read active products
CREATE POLICY "public read active products"
  ON products FOR SELECT
  USING (active = TRUE);

-- Products: only authenticated users (Emi) can insert/update/delete
CREATE POLICY "admin full access products"
  ON products FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Orders: anyone can insert (anonymous checkout)
CREATE POLICY "public create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

-- Orders: anyone can read (for order status page)
CREATE POLICY "public read orders"
  ON orders FOR SELECT
  USING (TRUE);

-- Orders: only Emi can update status
CREATE POLICY "admin update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Order items: anyone can insert (part of checkout)
CREATE POLICY "public create order_items"
  ON order_items FOR INSERT
  WITH CHECK (TRUE);

-- Order items: anyone can read (for order status page)
CREATE POLICY "public read order_items"
  ON order_items FOR SELECT
  USING (TRUE);
