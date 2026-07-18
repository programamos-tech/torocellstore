ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS minimum_sale_price numeric(15,2);

ALTER TABLE public.store_stock
  ADD COLUMN IF NOT EXISTS minimum_sale_price numeric(15,2);

-- Preserve the previous rule: products could not be sold below acquisition cost.
UPDATE public.products
SET minimum_sale_price = cost
WHERE minimum_sale_price IS NULL;

UPDATE public.store_stock
SET minimum_sale_price = COALESCE(cost, 0)
WHERE minimum_sale_price IS NULL;

ALTER TABLE public.products
  ALTER COLUMN minimum_sale_price SET DEFAULT 0,
  ALTER COLUMN minimum_sale_price SET NOT NULL;

ALTER TABLE public.store_stock
  ALTER COLUMN minimum_sale_price SET DEFAULT 0;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_minimum_sale_price_nonnegative;

ALTER TABLE public.products
  ADD CONSTRAINT products_minimum_sale_price_nonnegative
  CHECK (minimum_sale_price >= 0);

ALTER TABLE public.store_stock
  DROP CONSTRAINT IF EXISTS store_stock_minimum_sale_price_nonnegative;

ALTER TABLE public.store_stock
  ADD CONSTRAINT store_stock_minimum_sale_price_nonnegative
  CHECK (minimum_sale_price IS NULL OR minimum_sale_price >= 0);

COMMENT ON COLUMN public.products.minimum_sale_price IS
  'Precio mínimo permitido al facturar el producto en la tienda principal.';

COMMENT ON COLUMN public.store_stock.minimum_sale_price IS
  'Precio mínimo permitido al facturar el producto en esta microtienda.';
