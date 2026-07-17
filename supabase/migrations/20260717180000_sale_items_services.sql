-- Permitir líneas de servicio (reparación/mantenimiento) en facturas:
-- descripción libre en product_name, sin producto de inventario ni descuento de stock.

ALTER TABLE public.sale_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.sale_items
  ALTER COLUMN product_name TYPE text;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS item_type character varying(20) NOT NULL DEFAULT 'product';

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_item_type_check;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_item_type_check
  CHECK (item_type IN ('product', 'service'));

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_product_or_service_check;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_product_or_service_check
  CHECK (
    (item_type = 'product' AND product_id IS NOT NULL)
    OR (item_type = 'service' AND product_id IS NULL)
  );

COMMENT ON COLUMN public.sale_items.item_type IS
  'product = ítem de inventario; service = servicio con descripción libre (sin stock)';
