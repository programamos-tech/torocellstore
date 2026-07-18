export function formatSupplierNumber(value?: number | null): string {
  if (!value || value < 1) return 'P-SIN-NÚMERO'
  return `P-${String(value).padStart(6, '0')}`
}
