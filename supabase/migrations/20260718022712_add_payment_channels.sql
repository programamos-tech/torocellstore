ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS transfer_provider character varying(20);

ALTER TABLE public.sale_payments
  ADD COLUMN IF NOT EXISTS transfer_provider character varying(20);

ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS transfer_provider character varying(20);

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'credit', 'transfer', 'card', 'warranty', 'mixed'));

ALTER TABLE public.sale_payments
  DROP CONSTRAINT IF EXISTS sale_payments_payment_type_check;

ALTER TABLE public.sale_payments
  ADD CONSTRAINT sale_payments_payment_type_check
  CHECK (payment_type IN ('cash', 'transfer', 'card', 'credit'));

ALTER TABLE public.sales
  ADD CONSTRAINT sales_transfer_provider_check
  CHECK (
    transfer_provider IS NULL
    OR (
      payment_method = 'transfer'
      AND transfer_provider IN ('nequi', 'daviplata', 'bancolombia')
    )
  );

ALTER TABLE public.sale_payments
  ADD CONSTRAINT sale_payments_transfer_provider_check
  CHECK (
    transfer_provider IS NULL
    OR (
      payment_type = 'transfer'
      AND transfer_provider IN ('nequi', 'daviplata', 'bancolombia')
    )
  );

ALTER TABLE public.payment_records
  ADD CONSTRAINT payment_records_transfer_provider_check
  CHECK (
    transfer_provider IS NULL
    OR (
      payment_method = 'transfer'
      AND transfer_provider IN ('nequi', 'daviplata', 'bancolombia')
    )
  );

COMMENT ON COLUMN public.sales.transfer_provider IS
  'Canal usado cuando payment_method es transfer: nequi, daviplata o bancolombia.';

COMMENT ON COLUMN public.sale_payments.transfer_provider IS
  'Canal usado por el componente transfer de un pago mixto.';

COMMENT ON COLUMN public.payment_records.transfer_provider IS
  'Canal usado por un abono con payment_method transfer.';
