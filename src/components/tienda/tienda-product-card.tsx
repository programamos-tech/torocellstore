'use client'

import Link from 'next/link'
import { Heart, Package } from 'lucide-react'
import type { PublicCatalogProduct } from '@/lib/public-catalog'
import { TiendaProductImage } from '@/components/tienda/tienda-product-image'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { useTiendaFavorites } from '@/contexts/tienda-favorites-context'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

export function TiendaProductCard({ product }: { product: PublicCatalogProduct }) {
  const { addLine } = useTiendaCart()
  const { isFavorite, toggleFavorite } = useTiendaFavorites()
  const out = product.status === 'out_of_stock' || !product.inStock
  const hasImg = Boolean(product.imageUrl)
  const fav = isFavorite(product.id)

  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/tienda/p/${product.id}`}
        className="tienda-card-premium relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#111111]"
      >
        {hasImg ? (
          <TiendaProductImage
            src={product.imageUrl!}
            alt={product.name}
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/15">
            <Package className="h-14 w-14" strokeWidth={1} aria-hidden />
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(product.id)
          }}
          className={cn(
            'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm transition-colors',
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
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        {product.brand?.trim() && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6560]">
            {product.brand}
          </p>
        )}
        <Link href={`/tienda/p/${product.id}`}>
          <h2 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-[#eceae6] transition-colors group-hover:text-white">
            {product.name}
          </h2>
        </Link>
        <p className="tienda-display mt-2 text-lg font-semibold tabular-nums text-[#b8973f] sm:text-xl">
          {formatCOP(product.price)}
        </p>

        <button
          type="button"
          disabled={out}
          className={cn(
            'mt-3 inline-flex h-9 w-full items-center justify-center rounded-full text-xs font-semibold',
            'tienda-btn-outline-gold',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
          onClick={() => {
            if (out) return
            addLine({
              productId: product.id,
              name: product.name,
              reference: product.reference,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity: 1
            })
          }}
        >
          Agregar al carrito
        </button>
      </div>
    </article>
  )
}
