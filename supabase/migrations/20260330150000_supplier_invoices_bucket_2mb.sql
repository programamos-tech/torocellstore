-- Alinear límite del bucket con la app (comprobantes comprimidos en cliente + validación API)
UPDATE storage.buckets
SET file_size_limit = 2097152
WHERE id = 'supplier-invoices';
