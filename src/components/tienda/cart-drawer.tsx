'use client'

import Link from 'next/link'
import { TiendaProductImage } from '@/components/tienda/tienda-product-image'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

export function CartDrawer() {
  const {
    lines,
    drawerOpen,
    closeDrawer,
    subtotal,
    setQty,
    removeLine,
    clearCart
  } = useTiendaCart()

  if (!drawerOpen) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] zonat-modal-backdrop transition-opacity"
        aria-label="Cerrar carrito"
        onClick={closeDrawer}
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-white/10 bg-[#0d0d0d] shadow-2xl',
          'animate-in slide-in-from-right duration-200'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tienda-cart-title"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#9a968f]" strokeWidth={1.5} />
            <h2 id="tienda-cart-title" className="text-lg font-semibold text-[#f5f0e6]">
              Tu carrito
            </h2>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#9a968f] hover:bg-white/[0.06] hover:text-[#eceae6]"
            onClick={closeDrawer}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-14 w-14 text-white/15" strokeWidth={1} />
              <p className="mt-4 text-sm font-medium text-[#eceae6]">Aún no agregas productos</p>
              <p className="mt-1 text-xs text-[#9a968f]">Explora el catálogo y pulsa Agregar</p>
              <Link
                href="/tienda"
                onClick={closeDrawer}
                className="tienda-btn-outline-gold mt-6 inline-flex h-10 items-center rounded-full px-6 text-sm font-semibold"
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.lineId}
                  className="tienda-card-premium flex gap-3 rounded-xl p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#111111]">
                    {line.imageUrl ? (
                      <TiendaProductImage
                        src={line.imageUrl}
                        alt={line.name}
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/15">
                        <ShoppingBag className="h-8 w-8" strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#f5f0e6]">{line.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#a8a095]">{line.reference}</p>
                    <p className="tienda-display mt-1 text-base font-semibold tabular-nums text-[#b8973f]">
                      {formatCOP(line.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-white/10 bg-[#141414]">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center text-[#9a968f] hover:text-[#eceae6]"
                          onClick={() => setQty(line.lineId, line.quantity - 1)}
                          aria-label="Menos"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums text-[#f5f0e6]">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center text-[#9a968f] hover:text-[#eceae6]"
                          onClick={() => setQty(line.lineId, line.quantity + 1)}
                          aria-label="Más"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#a8a095] hover:bg-rose-500/10 hover:text-rose-400"
                        onClick={() => removeLine(line.lineId)}
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="bg-[#0a0a0a] px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9a968f]">Subtotal referencial</span>
              <span className="tienda-display text-xl font-semibold tabular-nums text-[#b8973f]">
                {formatCOP(subtotal)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#6b6560]">
              El pago y la entrega se coordinan en tienda o con tu asesor TOROCELL STORE.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/tienda/checkout"
                onClick={closeDrawer}
                className="tienda-btn-gold inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold"
              >
                Comprar
              </Link>
              <button
                type="button"
                className="tienda-btn-outline-gold h-11 w-full rounded-full text-sm font-semibold"
                onClick={() => {
                  clearCart()
                  closeDrawer()
                }}
              >
                Vaciar carrito
              </button>
              <Link
                href="/tienda"
                onClick={closeDrawer}
                className="inline-flex h-10 w-full items-center justify-center text-sm font-medium text-[#9a968f] hover:text-[#eceae6]"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
