-- Prefijo de factura por tienda (ej. ZT, TCC) para seriales únicos entre microtiendas.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;

-- Prefijos iniciales acordes al nombre de cada tienda.
UPDATE public.stores SET invoice_prefix = 'ZT'  WHERE id = '00000000-0000-0000-0000-000000000001' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'TZ'  WHERE id = 'c5cd953a-7fd8-43f3-ac0d-abae7634e580' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'TCS' WHERE id = '6de315e8-bc34-4735-bb53-cd512282ebba' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'TCC' WHERE id = '02ca5071-8128-4bb5-862b-6216bee8cef0' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'TCT' WHERE id = 'd8cbcaac-a43c-436e-adc7-593f8830c7a8' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'TJD' WHERE id = '0675870c-7ccd-48f5-8484-9dea1696c4ad' AND (invoice_prefix IS NULL OR invoice_prefix = '');
UPDATE public.stores SET invoice_prefix = 'BC'  WHERE id = 'b2976c51-0343-4f33-a25d-7b956e3fd574' AND (invoice_prefix IS NULL OR invoice_prefix = '');

-- Cualquier otra tienda sin prefijo: iniciales del nombre.
UPDATE public.stores
SET invoice_prefix = UPPER(
  LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(COALESCE(name, 'XX'), '[^A-Za-z0-9]+', ' ', 'g'),
      '(\S)\S*\s*',
      '\1',
      'g'
    ),
    4
  )
)
WHERE invoice_prefix IS NULL OR btrim(invoice_prefix) = '';

ALTER TABLE public.stores
  ALTER COLUMN invoice_prefix SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stores_invoice_prefix_unique
  ON public.stores (upper(invoice_prefix))
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.stores.invoice_prefix IS
  'Prefijo de serial de factura por tienda (ej. ZT → ZT-00001).';
