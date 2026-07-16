-- Pedidos desde catálogo público /tienda (transferencia + comprobante).

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS order_source VARCHAR(20) DEFAULT 'pos';

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_address TEXT;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_proof_deadline TIMESTAMPTZ;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS checkout_token UUID DEFAULT gen_random_uuid();

COMMENT ON COLUMN public.sales.order_source IS 'pos | web — origen del pedido.';
COMMENT ON COLUMN public.sales.payment_proof_deadline IS 'Límite para subir comprobante de transferencia (pedidos web).';

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50);

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tienda-payment-proofs',
  'tienda-payment-proofs',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "tienda_payment_proofs_read" ON storage.objects;
DROP POLICY IF EXISTS "tienda_payment_proofs_insert" ON storage.objects;

CREATE POLICY "tienda_payment_proofs_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tienda-payment-proofs');

CREATE POLICY "tienda_payment_proofs_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tienda-payment-proofs');
