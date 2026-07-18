ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date date;

COMMENT ON COLUMN public.clients.birth_date IS
  'Fecha de nacimiento opcional usada para ofrecer descuentos de cumpleaños.';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS discount_type character varying(20) NOT NULL DEFAULT 'amount';

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_discount_type_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_discount_type_check
  CHECK (discount_type IN ('amount', 'percentage'));
