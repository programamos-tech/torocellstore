import { supabase } from './supabase'
import { ClientsService } from './clients-service'
import { ProductsService } from './products-service'
import { WarrantyService } from './warranty-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
const LIMIT = 4

export type GlobalSearchKind =
  | 'client'
  | 'product'
  | 'sale'
  | 'credit'
  | 'supplier_invoice'
  | 'supplier'
  | 'transfer'
  | 'warranty'

export type GlobalSearchHit = {
  id: string
  kind: GlobalSearchKind
  label: string
  sublabel?: string
  href: string
}

export type GlobalSearchSection = {
  kind: GlobalSearchKind
  title: string
  hits: GlobalSearchHit[]
}

export type GlobalSearchModule =
  | 'clients'
  | 'products'
  | 'sales'
  | 'payments'
  | 'supplier_invoices'
  | 'transfers'
  | 'warranties'

function sanitizeTerm(term: string): string {
  return term.trim().replace(/[%_]/g, '')
}

function applyStoreFilter<T>(query: T, storeId: string | null): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any
  if (!storeId || storeId === MAIN_STORE_ID) {
    return q.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return q.eq('store_id', storeId)
}

async function searchProductsLite(
  term: string,
  storeId?: string | null
): Promise<GlobalSearchHit[]> {
  const cleanTerm = sanitizeTerm(term)
  if (!cleanTerm) return []

  try {
    const rows = await ProductsService.searchProducts(cleanTerm, 'all', storeId)
    return rows.slice(0, LIMIT).map((p) => ({
      id: `p-${p.id}`,
      kind: 'product' as const,
      label: p.name,
      sublabel: p.reference ? `Ref. ${p.reference}` : undefined,
      href: `/inventory/products/${p.id}`,
    }))
  } catch {
    return []
  }
}

async function searchSalesLite(term: string): Promise<GlobalSearchHit[]> {
  const cleanTerm = sanitizeTerm(term)
  if (!cleanTerm) return []

  const numericValue = cleanTerm.replace('#', '')
  const isNumber = !Number.isNaN(Number(numericValue)) && numericValue.length > 0
  const user = getCurrentUser()
  const storeId = getCurrentUserStoreId()

  let query = supabase
    .from('sales')
    .select('id, invoice_number, client_name, total, created_at')

  if (storeId && !canAccessAllStores(user)) {
    query = query.eq('store_id', storeId)
  }

  if (isNumber) {
    const padded = numericValue.padStart(3, '0')
    query = query.or(
      `invoice_number.eq.#${padded},invoice_number.ilike.%${numericValue}%,invoice_number.ilike.%-${padded},invoice_number.ilike.%-${numericValue},client_name.ilike.%${cleanTerm}%`
    )
  } else {
    // Prefijo o serial completo (ZT, ZT-00001, etc.)
    query = query.or(
      `invoice_number.ilike.%${cleanTerm}%,client_name.ilike.%${cleanTerm}%`
    )
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(LIMIT)
  if (error || !data) return []

  return data.map((sale) => ({
    id: `sale-${sale.id}`,
    kind: 'sale' as const,
    label: sale.client_name || 'Venta',
    sublabel: sale.invoice_number ? `Factura ${sale.invoice_number}` : undefined,
    href: `/sales/${sale.id}`,
  }))
}

async function searchCreditsLite(term: string): Promise<GlobalSearchHit[]> {
  const cleanTerm = sanitizeTerm(term)
  if (!cleanTerm) return []

  const storeId = getCurrentUserStoreId()
  let query = supabase
    .from('credits')
    .select('id, client_id, client_name, invoice_number, pending_amount')
    .or(`client_name.ilike.%${cleanTerm}%,invoice_number.ilike.%${cleanTerm}%`)

  query = applyStoreFilter(query, storeId)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(LIMIT)
  if (error || !data) return []

  return data.map((credit) => ({
    id: `credit-${credit.id}`,
    kind: 'credit' as const,
    label: credit.client_name || 'Crédito',
    sublabel: credit.invoice_number
      ? `Factura ${credit.invoice_number}${credit.pending_amount != null ? ` · pend. $${Number(credit.pending_amount).toLocaleString('es-CO')}` : ''}`
      : undefined,
    href: `/payments/${credit.client_id}/credit/${credit.id}`,
  }))
}

async function searchTransfersLite(term: string): Promise<GlobalSearchHit[]> {
  const cleanTerm = sanitizeTerm(term)
  if (!cleanTerm) return []

  const storeId = getCurrentUserStoreId()
  let query = supabase
    .from('stock_transfers')
    .select('id, transfer_number, status, description, from_store_id, to_store_id')
    .or(
      `transfer_number.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%,notes.ilike.%${cleanTerm}%`
    )

  if (storeId && storeId !== MAIN_STORE_ID) {
    query = query.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(LIMIT)
  if (error || !data) return []

  return data.map((t) => ({
    id: `transfer-${t.id}`,
    kind: 'transfer' as const,
    label: t.transfer_number || `Transferencia ${String(t.id).slice(0, 8)}`,
    sublabel: t.description || t.status,
    href: `/inventory/transfers/${t.id}`,
  }))
}

async function searchSupplierInvoicesLite(term: string): Promise<GlobalSearchHit[]> {
  const cleanTerm = sanitizeTerm(term)
  if (!cleanTerm) return []

  const hits: GlobalSearchHit[] = []

  let invoiceQuery = supabase
    .from('supplier_invoices')
    .select('id, invoice_number, suppliers(id, name)')
    .ilike('invoice_number', `%${cleanTerm}%`)

  invoiceQuery = applyStoreFilter(invoiceQuery, getCurrentUserStoreId())

  const { data: invoices, error } = await invoiceQuery
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (!error && invoices) {
    for (const inv of invoices) {
      const supplier = inv.suppliers as { id?: string; name?: string } | null
      hits.push({
        id: `si-${inv.id}`,
        kind: 'supplier_invoice',
        label: inv.invoice_number || 'Factura proveedor',
        sublabel: supplier?.name ? `Proveedor: ${supplier.name}` : undefined,
        href: `/purchases/invoices/${inv.id}`,
      })
    }
  }

  if (hits.length >= LIMIT) return hits.slice(0, LIMIT)

  let supplierQuery = supabase.from('suppliers').select('id, name').ilike('name', `%${cleanTerm}%`)
  supplierQuery = applyStoreFilter(supplierQuery, getCurrentUserStoreId())

  const { data: suppliers } = await supplierQuery.order('name').limit(3)
  for (const s of suppliers || []) {
    if (hits.some((h) => h.id === `sup-${s.id}`)) continue
    hits.push({
      id: `sup-${s.id}`,
      kind: 'supplier',
      label: s.name,
      sublabel: 'Proveedor',
      href: `/purchases/invoices/supplier/${s.id}`,
    })
    if (hits.length >= LIMIT) break
  }

  return hits.slice(0, LIMIT)
}

const SECTION_META: Record<
  GlobalSearchKind,
  { title: string; module: GlobalSearchModule | null }
> = {
  client: { title: 'Clientes', module: 'clients' },
  product: { title: 'Productos', module: 'products' },
  sale: { title: 'Ventas', module: 'sales' },
  credit: { title: 'Créditos', module: 'payments' },
  supplier_invoice: { title: 'Facturas proveedor', module: 'supplier_invoices' },
  supplier: { title: 'Proveedores', module: 'supplier_invoices' },
  transfer: { title: 'Transferencias', module: 'transfers' },
  warranty: { title: 'Garantías', module: 'warranties' },
}

export async function runGlobalSearch(
  query: string,
  options: {
    storeId?: string | null
    enabledModules: GlobalSearchModule[]
  }
): Promise<GlobalSearchSection[]> {
  const term = sanitizeTerm(query)
  if (term.length < 2) return []

  const { storeId, enabledModules } = options
  const enabled = new Set(enabledModules)

  const tasks: { kind: GlobalSearchKind; run: () => Promise<GlobalSearchHit[]> }[] = []

  if (enabled.has('clients')) {
    tasks.push({
      kind: 'client',
      run: async () => {
        const rows = await ClientsService.searchClients(term)
        return rows.slice(0, LIMIT).map((c) => ({
          id: `c-${c.id}`,
          kind: 'client' as const,
          label: c.name,
          sublabel: c.document ? `Doc. ${c.document}` : undefined,
          href: `/clients/${c.id}`,
        }))
      },
    })
  }

  if (enabled.has('products')) {
    tasks.push({ kind: 'product', run: () => searchProductsLite(term, storeId) })
  }

  if (enabled.has('sales')) {
    tasks.push({ kind: 'sale', run: () => searchSalesLite(term) })
  }

  if (enabled.has('payments')) {
    tasks.push({ kind: 'credit', run: () => searchCreditsLite(term) })
  }

  if (enabled.has('supplier_invoices')) {
    tasks.push({ kind: 'supplier_invoice', run: () => searchSupplierInvoicesLite(term) })
  }

  if (enabled.has('transfers')) {
    tasks.push({ kind: 'transfer', run: () => searchTransfersLite(term) })
  }

  if (enabled.has('warranties')) {
    tasks.push({
      kind: 'warranty',
      run: async () => {
        const rows = await WarrantyService.searchWarranties(term)
        return rows.slice(0, LIMIT).map((w) => ({
          id: `w-${w.id}`,
          kind: 'warranty' as const,
          label: w.clientName || w.productReceivedName || 'Garantía',
          sublabel: w.productReceivedName
            ? `${w.productReceivedName}${w.status ? ` · ${w.status}` : ''}`
            : w.reason,
          href: `/warranties/${w.id}`,
        }))
      },
    })
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.run()))

  const byKind = new Map<GlobalSearchKind, GlobalSearchHit[]>()
  settled.forEach((result) => {
    if (result.status !== 'fulfilled') return
    for (const hit of result.value) {
      const prev = byKind.get(hit.kind) ?? []
      byKind.set(hit.kind, [...prev, hit])
    }
  })

  const order: GlobalSearchKind[] = [
    'client',
    'product',
    'sale',
    'credit',
    'supplier_invoice',
    'supplier',
    'transfer',
    'warranty',
  ]

  const sections: GlobalSearchSection[] = []
  for (const kind of order) {
    const hits = byKind.get(kind)
    if (!hits?.length) continue
    const meta = SECTION_META[kind]
    sections.push({ kind, title: meta.title, hits })
  }

  return sections
}
