ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_number bigint;

WITH numbered AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY store_id
      ORDER BY created_at, id
    ) AS supplier_number
  FROM public.suppliers
  WHERE supplier_number IS NULL
)
UPDATE public.suppliers AS suppliers
SET supplier_number = numbered.supplier_number
FROM numbered
WHERE suppliers.id = numbered.id;

ALTER TABLE public.suppliers
  ALTER COLUMN supplier_number SET NOT NULL;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_store_supplier_number_key
  UNIQUE (store_id, supplier_number);

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_id_store_key
  UNIQUE (id, store_id);

CREATE OR REPLACE FUNCTION public.assign_supplier_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.supplier_number IS NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('supplier_number'),
      pg_catalog.hashtext(NEW.store_id::text)
    );

    SELECT COALESCE(MAX(s.supplier_number), 0) + 1
    INTO NEW.supplier_number
    FROM public.suppliers AS s
    WHERE s.store_id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_assign_number ON public.suppliers;

CREATE TRIGGER suppliers_assign_number
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.assign_supplier_number();

CREATE TABLE public.product_supplier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL
    REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL
    REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_supplier_assignments_store_product_key
    UNIQUE (store_id, product_id),
  CONSTRAINT product_supplier_assignments_supplier_store_fkey
    FOREIGN KEY (supplier_id, store_id)
    REFERENCES public.suppliers(id, store_id)
    ON DELETE RESTRICT
);

CREATE INDEX product_supplier_assignments_product_idx
  ON public.product_supplier_assignments(product_id);

CREATE INDEX product_supplier_assignments_supplier_store_idx
  ON public.product_supplier_assignments(supplier_id, store_id);

COMMENT ON COLUMN public.suppliers.supplier_number IS
  'Número interno, secuencial e inmutable del proveedor dentro de cada tienda.';

COMMENT ON TABLE public.product_supplier_assignments IS
  'Proveedor asignado a cada producto dentro de una tienda.';
