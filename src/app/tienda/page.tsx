import { getPublicCatalogProducts, getPublicCatalogStoreInfo } from '@/lib/public-catalog'
import { CatalogStorefront } from '@/components/tienda/catalog-storefront'

/** Catálogo siempre desde BD (no snapshot estático en build). */
export const dynamic = 'force-dynamic'

export default async function TiendaPage() {
  const [products, store] = await Promise.all([
    getPublicCatalogProducts(),
    getPublicCatalogStoreInfo()
  ])
  return <CatalogStorefront products={products} store={store} />
}
