/**
 * Seriales de factura por tienda: PREFIX-##### (ej. ZT-00042).
 * Las facturas legacy (#661) se siguen mostrando tal cual.
 */

const PREFIX_RE = /^[A-Z][A-Z0-9]{1,5}$/
const NEW_SERIAL_RE = /^([A-Z][A-Z0-9]{1,5})-(\d+)$/i

/** Palabras que no aportan a las iniciales del nombre de tienda. */
const STOP = new Set(['DE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'Y', 'E', 'EN', 'A'])

/** Genera un prefijo corto a partir del nombre (Zona T → ZT). */
export function deriveInvoicePrefix(storeName: string): string {
  const cleaned = (storeName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toUpperCase()

  if (!cleaned) return 'XX'

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0 && !STOP.has(w))
  const source = words.length > 0 ? words : cleaned.split(/\s+/).filter(Boolean)

  let prefix = source.map((w) => w[0]).join('').slice(0, 4)
  if (prefix.length < 2) {
    prefix = (source[0] || 'XX').slice(0, Math.max(2, Math.min(3, (source[0] || 'XX').length)))
  }
  return prefix.slice(0, 4)
}

export function normalizeInvoicePrefix(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export function isValidInvoicePrefix(prefix: string): boolean {
  return PREFIX_RE.test(normalizeInvoicePrefix(prefix))
}

export function formatStoreInvoiceNumber(prefix: string, sequence: number): string {
  const p = normalizeInvoicePrefix(prefix) || 'XX'
  const n = Math.max(1, Math.floor(sequence))
  return `${p}-${String(n).padStart(5, '0')}`
}

/** Para UI: legacy #661 o nuevo ZT-00042. */
export function displayInvoiceNumber(invoiceNumber: string | null | undefined): string {
  if (!invoiceNumber) return '—'
  const raw = String(invoiceNumber).trim()
  if (!raw) return '—'
  if (raw.startsWith('#')) return raw
  if (NEW_SERIAL_RE.test(raw)) return raw.toUpperCase()
  // Número suelto legacy sin #
  if (/^\d+$/.test(raw)) return `#${raw.padStart(3, '0')}`
  return raw
}

export function parsePrefixedInvoiceSequence(
  invoiceNumber: string
): { prefix: string; sequence: number } | null {
  const m = String(invoiceNumber).trim().match(NEW_SERIAL_RE)
  if (!m) return null
  return { prefix: m[1].toUpperCase(), sequence: Number(m[2]) }
}
