-- P0 #4: make the product-images bucket reproducible and add the missing
-- Storage policies (without these, authenticated uploads are blocked by default).

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public can read images (bucket is public; explicit policy for clarity)
CREATE POLICY "public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Only Emi (authenticated) can upload/replace images
CREATE POLICY "auth upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "auth update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');
