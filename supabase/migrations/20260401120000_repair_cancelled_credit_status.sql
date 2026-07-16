-- Reparación única: créditos cuya venta (factura) ya está anulada pero el crédito sigue pending/partial/overdue.
-- No elimina abonos; los marca cancelled para reportes (sin implicar devolución en caja).

-- 1) Créditos ligados por sale_id a una venta cancelada
UPDATE public.credits c
SET
  status = 'cancelled',
  total_amount = 0,
  pending_amount = 0,
  paid_amount = 0,
  is_cancelled = true,
  is_active = false,
  cancelled_at = COALESCE(c.cancelled_at, s.updated_at, NOW()),
  cancellation_reason = COALESCE(
    c.cancellation_reason,
    'Reparación automática: factura anulada (' || COALESCE(s.invoice_number, s.id::text) || ')'
  ),
  updated_at = NOW()
FROM public.sales s
WHERE c.sale_id = s.id
  AND s.status = 'cancelled'
  AND c.status IS DISTINCT FROM 'cancelled';

-- 2) Créditos con is_cancelled o cancelled_at pero status incorrecto
UPDATE public.credits c
SET
  status = 'cancelled',
  total_amount = 0,
  pending_amount = 0,
  paid_amount = 0,
  is_cancelled = true,
  is_active = false,
  updated_at = NOW()
WHERE c.status IS DISTINCT FROM 'cancelled'
  AND (c.is_cancelled = true OR c.cancelled_at IS NOT NULL);

-- 3) Créditos por factura/cliente cuando todas las ventas de esa factura están canceladas
UPDATE public.credits c
SET
  status = 'cancelled',
  total_amount = 0,
  pending_amount = 0,
  paid_amount = 0,
  is_cancelled = true,
  is_active = false,
  cancelled_at = COALESCE(c.cancelled_at, NOW()),
  cancellation_reason = COALESCE(
    c.cancellation_reason,
    'Reparación automática: todas las facturas del crédito están anuladas'
  ),
  updated_at = NOW()
WHERE c.status IS DISTINCT FROM 'cancelled'
  AND c.invoice_number IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.invoice_number = c.invoice_number
      AND s.client_id = c.client_id
      AND s.status = 'cancelled'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.sales s2
    WHERE s2.invoice_number = c.invoice_number
      AND s2.client_id = c.client_id
      AND s2.status IS DISTINCT FROM 'cancelled'
  );

-- 4) Abonos activos de créditos ya reparados (vía payments → sale cancelada)
UPDATE public.payment_records pr
SET
  status = 'cancelled',
  cancelled_at = COALESCE(pr.cancelled_at, NOW()),
  cancelled_by_name = COALESCE(pr.cancelled_by_name, 'Sistema (reparación)'),
  cancellation_reason = COALESCE(
    pr.cancellation_reason,
    'Reparación automática: crédito anulado por factura cancelada'
  )
FROM public.payments p
INNER JOIN public.credits c ON (
  c.sale_id = p.sale_id
  OR (
    c.invoice_number IS NOT NULL
    AND c.invoice_number = p.invoice_number
    AND c.client_id = p.client_id
  )
)
INNER JOIN public.sales s ON c.sale_id = s.id
WHERE pr.payment_id = p.id
  AND s.status = 'cancelled'
  AND c.status = 'cancelled'
  AND pr.status IS DISTINCT FROM 'cancelled';

-- 5) Fila legacy en payments
UPDATE public.payments p
SET
  status = 'cancelled',
  total_amount = 0,
  pending_amount = 0,
  paid_amount = 0,
  cancelled_at = COALESCE(p.cancelled_at, NOW()),
  cancellation_reason = COALESCE(
    p.cancellation_reason,
    'Reparación automática: factura de crédito anulada'
  )
FROM public.credits c
INNER JOIN public.sales s ON c.sale_id = s.id
WHERE c.status = 'cancelled'
  AND s.status = 'cancelled'
  AND (
    p.sale_id = c.sale_id
    OR (
      p.invoice_number = c.invoice_number
      AND p.client_id = c.client_id
    )
  )
  AND p.status IS DISTINCT FROM 'cancelled';
