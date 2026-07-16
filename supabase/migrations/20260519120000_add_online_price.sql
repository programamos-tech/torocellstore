-- Precio de venta en tienda virtual (catálogo público /tienda), independiente del precio por mayor.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS online_price NUMERIC(15,2);

ALTER TABLE public.store_stock
ADD COLUMN IF NOT EXISTS online_price NUMERIC(15,2);

COMMENT ON COLUMN public.products.online_price IS 'Precio de venta en tienda virtual (catálogo público). Distinto del precio por mayor (price).';
COMMENT ON COLUMN public.store_stock.online_price IS 'Precio de venta en tienda virtual para esta microtienda. Distinto del precio por mayor (price).';
