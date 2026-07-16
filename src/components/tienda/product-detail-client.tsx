'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Heart, MapPin, Minus, Package, Plus, ShoppingBag } from 'lucide-react'
import type { PublicProductDetail, PublicCatalogStoreInfo } from '@/lib/public-catalog'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { useTiendaFavorites } from '@/contexts/tienda-favorites-context'
import { TiendaPageShell } from '@/components/tienda/tienda-page-shell'
import { TiendaProductImage } from '@/components/tienda/tienda-product-image'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

function formatUnits(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

export function ProductDetailClient({
  product,
  store
}: {
  product: PublicProductDetail
  store?: PublicCatalogStoreInfo | null
}) {
  const { addLine } = useTiendaCart()
  const { isFavorite, toggleFavorite } = useTiendaFavorites()
  const [qty, setQty] = useState(1)
  const out = product.status === 'out_of_stock' || !product.inStock
  const hasImg = Boolean(product.imageUrl)
  const fav = isFavorite(product.id)

  const storeLabel = product.mainStoreName || store?.name || 'TOROCELL STORE'
  const storeCity = product.mainStoreCity || store?.city

  return (
    <TiendaPageShell store={store}>
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/tienda"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[#9a968f] transition-colors hover:text-[#eceae6] sm:mb-6 sm:text-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Volver al catálogo
        </Link>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 lg:gap-x-14">
          <div className="tienda-card-premium relative aspect-[4/5] w-full overflow-hidden rounded-2xl lg:aspect-square lg:max-h-[min(520px,70vh)]">
            {hasImg ? (
              <TiendaProductImage
                src={product.imageUrl!}
                alt={product.name}
                className="object-contain p-6 sm:p-10"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/15">
                <Package className="h-20 w-20 sm:h-28 sm:w-28" strokeWidth={1} aria-hidden />
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className={cn(
                'absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]/85 backdrop-blur-sm transition-colors',
                fav ? 'text-rose-400' : 'text-[#6b6560] hover:text-[#d4d0c8]'
              )}
              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={cn('h-4 w-4', fav && 'fill-current')} strokeWidth={1.75} />
            </button>

            {out && (
              <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-[#0a0a0a]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#9a968f]">
                Agotado
              </span>
            )}
          </div>

          <div className="flex flex-col lg:py-2">
            {product.brand?.trim() && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b6560]">
                {product.brand}
              </p>
            )}

            <h1 className="tienda-display mt-1 text-2xl font-semibold leading-snug text-[#f5f0e6] sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <p className="mt-2 font-mono text-xs text-[#6b6560]">Ref. {product.reference}</p>

            <p className="tienda-display mt-5 text-3xl font-semibold tabular-nums text-[#b8973f] sm:text-4xl">
              {formatCOP(product.price)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#6b6560]">Precio referencial en COP</p>

            {!out && (
              <p className="mt-4 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#9a968f]">
                {formatUnits(product.totalUnits)} disponible{product.totalUnits === 1 ? '' : 's'} en tienda
              </p>
            )}

            <div className="mt-6 flex items-start gap-2.5 text-sm text-[#9a968f]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9a968f]" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="font-medium text-[#f5f0e6]">{storeLabel}</p>
                {storeCity && <p className="mt-0.5 text-xs">{storeCity}</p>}
                {store?.address && (
                  <p className="mt-0.5 text-xs text-[#6b6560]">{store.address}</p>
                )}
              </div>
            </div>

            {product.description?.trim() && (
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b6560]">
                  Descripción
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#9a968f]">{product.description}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex h-10 items-center rounded-full border border-white/10 bg-[#141414] px-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#9a968f] hover:text-[#eceae6]"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Menos"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-[#f5f0e6]">{qty}</span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#9a968f] hover:text-[#eceae6]"
                  onClick={() => setQty((q) => Math.min(product.totalUnits || 99, q + 1))}
                  aria-label="Más"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={out}
                className={cn(
                  'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold',
                  'tienda-btn-gold disabled:cursor-not-allowed disabled:opacity-40',
                  'sm:max-w-xs'
                )}
                onClick={() => {
                  if (out) return
                  addLine({
                    productId: product.id,
                    name: product.name,
                    reference: product.reference,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: qty
                  })
                  setQty(1)
                }}
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                Agregar al carrito
              </button>
            </div>

            <p className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-[#6b6560]">
              Disponibilidad y pago se confirman en tienda o con tu asesor TOROCELL STORE. Envíos a toda Colombia.
            </p>
          </div>
        </div>
      </main>
    </TiendaPageShell>
  )
}
