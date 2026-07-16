'use client'

import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import type { PublicCatalogProduct, PublicCatalogStoreInfo } from '@/lib/public-catalog'
import { useTiendaFavorites } from '@/contexts/tienda-favorites-context'
import { TiendaAnnouncementBar } from '@/components/tienda/tienda-announcement-bar'
import { TiendaHeader } from '@/components/tienda/tienda-header'
import { TiendaProductCard } from '@/components/tienda/tienda-product-card'
import { TiendaFooter } from '@/components/tienda/tienda-footer'
import { cn } from '@/lib/utils'

export function FavoritesPageClient({
  products,
  store
}: {
  products: PublicCatalogProduct[]
  store: PublicCatalogStoreInfo | null
}) {
  const { ids } = useTiendaFavorites()

  const favorites = useMemo(
    () => products.filter((p) => ids.has(p.id)),
    [products, ids]
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <TiendaAnnouncementBar />
      <TiendaHeader storeName={store?.name} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#6b6560]">Tu selección</p>
        <h1 className="tienda-display mt-2 text-3xl font-semibold text-[#f5f0e6] sm:text-4xl">Favoritos</h1>
        <p className="mt-2 text-sm text-[#9a968f]">
          {favorites.length === 0
            ? 'Guarda los celulares que te interesen tocando el corazón en el catálogo.'
            : `${favorites.length} producto${favorites.length === 1 ? '' : 's'} guardado${favorites.length === 1 ? '' : 's'}.`}
        </p>

        {favorites.length === 0 ? (
          <div className={cn('tienda-card-premium mt-12 flex flex-col items-center rounded-3xl py-16 text-center')}>
            <Heart className="h-12 w-12 text-white/15" strokeWidth={1.25} />
            <p className="mt-4 text-sm font-medium text-[#eceae6]">Aún no tienes favoritos</p>
            <Link
              href="/tienda"
              className="tienda-btn-gold mt-6 inline-flex h-10 items-center rounded-full px-8 text-sm font-semibold"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((p) => (
              <TiendaProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <TiendaFooter store={store} />
    </div>
  )
}
