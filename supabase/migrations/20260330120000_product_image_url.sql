-- Foto de catálogo por producto (URL pública en Storage)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.products.image_url IS 'URL pública de la imagen del producto (catálogo Zonat)';

-- Bucket imágenes de producto (5MB; solo imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_storage_delete" ON storage.objects;

CREATE POLICY "product_images_storage_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_storage_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');
