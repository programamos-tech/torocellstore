import { getPublicCatalogStoreId } from '@/config/public-catalog'
import { supabaseAdmin } from '@/lib/supabase'

/** Tienda principal del sistema (catálogo legacy / bodega). */
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const STOCK_PAGE = 1000
const MAX_CATALOG_ROWS = 2500

/**
 * Extrae la ruta public/storage de una URL de Supabase Storage.
 * Ej: product-images/catalog/foo.jpg
 */
function extractSupabasePublicObjectPath(urlOrPath: string): string | null {
  const trimmed = urlOrPath.trim()
  const publicMatch = trimmed.match(/\/storage\/v1\/object\/public\/(.+)$/i)
  if (publicMatch?.[1]) {
    return publicMatch[1].replace(/\?.*$/, '')
  }
  if (!trimmed.startsWith('http') && !trimmed.startsWith('/storage/')) {
    return trimmed.replace(/^\//, '')
  }
  return null
}

/**
 * Normaliza la URL de imagen del catálogo público al proyecto Supabase actual.
 * Reescribe URLs de localhost u otro host si la ruta en Storage es válida.
 */
export function normalizePublicProductImageUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return null

  const objectPath = extractSupabasePublicObjectPath(raw.trim())
  if (!objectPath) return null

  if (!objectPath.startsWith('product-images/')) {
    return null
  }

  return `${baseUrl}/storage/v1/object/public/${objectPath}`
}

export type PublicCatalogProduct = {
  id: string
  name: string
  reference: string
  description: string
  price: number
  brand: string
  imageUrl: string | null
  categoryName: string | null
  inStock: boolean
  status: string
}

/** Punto de venta con unidades disponibles (público, sin costos). */
export type PublicStoreAvailability = {
  storeId: string
  name: string
  city: string | null
  quantity: number
  isMain: boolean
}

export type PublicCatalogStoreInfo = {
  id: string
  name: string
  city: string | null
  address: string | null
  phone: string | null
}

export type PublicProductDetail = PublicCatalogProduct & {
  stockWarehouse: number
  stockStoreFloor: number
  mainStoreName: string
  mainStoreCity: string | null
  /** Microtiendas con stock > 0 (la principal va en stockWarehouse / stockStoreFloor). */
  microStores: PublicStoreAvailability[]
  /** Suma bodega + mostrador principal + microtiendas (o stock de la microtienda en catálogo focalizado). */
  totalUnits: number
  /** Catálogo de una sola microtienda (p. ej. telefonía). */
  singleStoreCatalog?: boolean
}

type ProductRow = {
  id: string
  name?: string | null
  reference?: string | null
  description?: string | null
  price?: number | null
  online_price?: number | null
  brand?: string | null
  image_url?: string | null
  status?: string | null
  category_id?: string | null
}

type StoreStockRow = {
  quantity?: number | null
  price?: number | null
  online_price?: number | null
  product_id?: string | null
  products?: ProductRow | ProductRow[] | null
}

function resolveProductJoin(row: StoreStockRow): ProductRow | null {
  const p = row.products
  if (!p) return null
  return Array.isArray(p) ? p[0] ?? null : p
}

/** Precio público de la tienda virtual (no usa precio por mayor). */
function resolveOnlineSalePrice(storeOnlinePrice: number, productOnlinePrice: number): number {
  if (storeOnlinePrice > 0) return storeOnlinePrice
  if (productOnlinePrice > 0) return productOnlinePrice
  return 0
}

async function loadCategoryMap(catIds: string[]): Promise<Map<string, string>> {
  if (catIds.length === 0) return new Map()
  const { data: cats } = await supabaseAdmin.from('categories').select('id, name').in('id', catIds)
  if (!cats) return new Map()
  return new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]))
}

function mapProductToCatalog(
  row: ProductRow,
  quantity: number,
  salePrice: number,
  catMap: Map<string, string>
): PublicCatalogProduct {
  const status = String(row.status ?? 'active')
  const cid = row.category_id
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    reference: String(row.reference ?? ''),
    description: String(row.description ?? ''),
    price: salePrice,
    brand: String(row.brand ?? ''),
    imageUrl: normalizePublicProductImageUrl(row.image_url ? String(row.image_url) : null),
    categoryName: cid ? catMap.get(cid)?.trim() || null : null,
    inStock: quantity > 0 && status !== 'out_of_stock',
    status
  }
}

export async function getPublicCatalogStoreInfo(
  storeId = getPublicCatalogStoreId()
): Promise<PublicCatalogStoreInfo | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !storeId) return null

  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, city, address, phone')
    .eq('id', storeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: String(data.id),
    name: String(data.name ?? 'TOROCELL STORE').trim() || 'TOROCELL STORE',
    city: data.city != null ? String(data.city).trim() || null : null,
    address: data.address != null ? String(data.address).trim() || null : null,
    phone: data.phone != null ? String(data.phone).trim() || null : null
  }
}

async function fetchMicroStoreCatalogProducts(storeId: string): Promise<PublicCatalogProduct[]> {
  const productSelect =
    'id, name, reference, description, price, online_price, brand, image_url, status, category_id'

  const rows: StoreStockRow[] = []
  let offset = 0

  while (rows.length < MAX_CATALOG_ROWS) {
    const { data, error } = await supabaseAdmin
      .from('store_stock')
      .select(`quantity, price, online_price, product_id, products!inner(${productSelect})`)
      .eq('store_id', storeId)
      .gt('quantity', 0)
      .order('quantity', { ascending: false })
      .range(offset, offset + STOCK_PAGE - 1)

    if (error) {
      console.error('[getPublicCatalogProducts] store_stock:', error.message)
      break
    }
    if (!data?.length) break

    rows.push(...(data as StoreStockRow[]))
    if (data.length < STOCK_PAGE) break
    offset += STOCK_PAGE
  }

  const catIds = [
    ...new Set(
      rows
        .map((r) => resolveProductJoin(r)?.category_id)
        .filter((id): id is string => Boolean(id))
    )
  ]
  const catMap = await loadCategoryMap(catIds)

  const products = rows
    .map((stockRow) => {
      const product = resolveProductJoin(stockRow)
      if (!product?.id) return null
      const status = String(product.status ?? 'active')
      if (status !== 'active' && status !== 'out_of_stock') return null
      const quantity = Math.max(0, Math.floor(Number(stockRow.quantity ?? 0)))
      if (quantity < 1) return null
      const salePrice = resolveOnlineSalePrice(
        Number(stockRow.online_price ?? 0),
        Number(product.online_price ?? 0)
      )
      if (salePrice <= 0) return null
      return mapProductToCatalog(product, quantity, salePrice, catMap)
    })
    .filter((p): p is PublicCatalogProduct => Boolean(p))

  products.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

  return products
}

/**
 * Catálogo público focalizado en la microtienda configurada (telefonía por defecto).
 * Solo productos con stock > 0 en esa sucursal.
 */
export async function getPublicCatalogProducts(): Promise<PublicCatalogProduct[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }

  const storeId = getPublicCatalogStoreId()
  if (!storeId) {
    return []
  }

  return fetchMicroStoreCatalogProducts(storeId)
}

export async function getPublicProductDetailById(id: string): Promise<PublicProductDetail | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !id?.trim()) {
    return null
  }

  const pid = id.trim()
  const storeId = getPublicCatalogStoreId()

  if (!storeId) {
    return null
  }

  const storeInfo = await getPublicCatalogStoreInfo(storeId)
  if (!storeInfo) {
    return null
  }

  const { data: stockRow, error: stockErr } = await supabaseAdmin
    .from('store_stock')
    .select(
      'quantity, price, online_price, products!inner(id, name, reference, description, price, online_price, brand, image_url, status, category_id)'
    )
    .eq('store_id', storeId)
    .eq('product_id', pid)
    .maybeSingle()

  if (stockErr || !stockRow) {
    return null
  }

  const product = resolveProductJoin(stockRow as StoreStockRow)
  if (!product) return null

  const status = String(product.status ?? 'active')
  if (status !== 'active' && status !== 'out_of_stock') {
    return null
  }

  const quantity = Math.max(0, Math.floor(Number((stockRow as StoreStockRow).quantity ?? 0)))
  if (quantity < 1) {
    return null
  }
  const salePrice = resolveOnlineSalePrice(
    Number((stockRow as StoreStockRow).online_price ?? 0),
    Number(product.online_price ?? 0)
  )
  if (salePrice <= 0) {
    return null
  }

  const cid = product.category_id
  let categoryName: string | null = null
  if (cid) {
    const catMap = await loadCategoryMap([cid])
    categoryName = catMap.get(cid)?.trim() || null
  }

  const inStock = quantity > 0 && status !== 'out_of_stock'

  return {
    id: String(product.id),
    name: String(product.name ?? ''),
    reference: String(product.reference ?? ''),
    description: String(product.description ?? ''),
    price: salePrice,
    brand: String(product.brand ?? ''),
    imageUrl: normalizePublicProductImageUrl(product.image_url ? String(product.image_url) : null),
    categoryName,
    inStock,
    status,
    stockWarehouse: 0,
    stockStoreFloor: quantity,
    mainStoreName: storeInfo.name,
    mainStoreCity: storeInfo.city,
    microStores: [],
    totalUnits: quantity,
    singleStoreCatalog: true
  }
}
