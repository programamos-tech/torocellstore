export const SALES_POS_STORAGE_KEY = 'torocell_sales_pos_mode'

export function readSalesPosMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SALES_POS_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeSalesPosMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SALES_POS_STORAGE_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new Event('zonat-sales-pos-change'))
  } catch {
    // ignore
  }
}
