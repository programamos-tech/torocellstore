import { getPublicCatalogProducts, getPublicCatalogStoreInfo } from '@/lib/public-catalog'
import { FavoritesPageClient } from '@/components/tienda/favorites-page-client'

export const dynamic = 'force-dynamic'

export default async function TiendaFavoritosPage() {
  const [products, store] = await Promise.all([
    getPublicCatalogProducts(),
    getPublicCatalogStoreInfo()
  ])
  return <FavoritesPageClient products={products} store={store} />
}
