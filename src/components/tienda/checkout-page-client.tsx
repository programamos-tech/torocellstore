'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { TiendaProductImage } from '@/components/tienda/tienda-product-image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Banknote, Loader2, ShoppingBag } from 'lucide-react'
import type { TiendaBankDetails } from '@/config/tienda-storefront'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { TiendaAnnouncementBar } from '@/components/tienda/tienda-announcement-bar'
import { TiendaHeader } from '@/components/tienda/tienda-header'
import { TiendaFooter } from '@/components/tienda/tienda-footer'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

const inputClass =
  'h-11 w-full rounded-xl border border-white/10 bg-[#141414] px-3 text-sm text-[#eceae6] placeholder:text-[#6b6560] focus:border-[#b8973f]/40 focus:outline-none focus:ring-2 focus:ring-[#b8973f]/15'

export function CheckoutPageClient({
  storeName,
  bank
}: {
  storeName?: string | null
  bank: TiendaBankDetails | null
}) {
  const router = useRouter()
  const { lines, subtotal, clearCart } = useTiendaCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Sincelejo',
    address: '',
    notes: ''
  })

  const isEmpty = lines.length === 0

  useEffect(() => {
    if (isEmpty) {
      router.replace('/tienda')
    }
  }, [isEmpty, router])

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEmpty || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/tienda/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customer: form
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el pedido')
      }

      clearCart()
      const { order } = data
      router.push(`/tienda/pedido/${order.id}?token=${encodeURIComponent(order.checkoutToken)}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido')
      setSubmitting(false)
    }
  }

  if (isEmpty) {
    return null
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TiendaAnnouncementBar />
      <TiendaHeader storeName={storeName} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/tienda"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#9a968f] transition-colors hover:text-[#eceae6]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <h1 className="tienda-display text-3xl font-semibold text-[#eceae6] sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-[#9a968f]">
          Completa tus datos y confirma el pedido. El pago es por transferencia bancaria.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-3">
            <div className="tienda-card-premium rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d4d0c8]">
                Datos de entrega
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-[#9a968f]">Nombre completo *</label>
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9a968f]">Teléfono / WhatsApp *</label>
                  <input
                    required
                    type="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9a968f]">Correo</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9a968f]">Ciudad *</label>
                  <input
                    required
                    className={inputClass}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-[#9a968f]">Dirección de entrega *</label>
                  <input
                    required
                    className={inputClass}
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-[#9a968f]">Notas del pedido</label>
                  <textarea
                    rows={3}
                    className={cn(inputClass, 'h-auto py-2')}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {bank && (
              <div className="tienda-card-premium rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[#b8973f]">
                  <Banknote className="h-5 w-5" strokeWidth={1.5} />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Pago por transferencia</h2>
                </div>
                <p className="mt-3 text-sm text-[#9a968f]">
                  Después de confirmar el pedido tendrás un tiempo limitado para subir el comprobante.
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <dt className="text-[#6b6560]">Banco</dt>
                    <dd className="font-medium text-[#eceae6]">{bank.bankName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <dt className="text-[#6b6560]">Tipo de cuenta</dt>
                    <dd className="font-medium text-[#eceae6]">{bank.accountType}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <dt className="text-[#6b6560]">Número</dt>
                    <dd className="font-mono font-medium text-[#eceae6]">{bank.accountNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#6b6560]">Titular</dt>
                    <dd className="text-right font-medium text-[#eceae6]">{bank.accountHolder}</dd>
                  </div>
                </dl>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="tienda-btn-gold inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando pedido…
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  Confirmar pedido
                </>
              )}
            </button>
          </form>

          <aside className="lg:col-span-2">
            <div className="tienda-card-premium sticky top-24 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d4d0c8]">
                Resumen ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
              </h2>
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                {lines.map((line) => (
                  <li key={line.lineId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#111]">
                      {line.imageUrl ? (
                        <TiendaProductImage
                          src={line.imageUrl}
                          alt={line.name}
                          className="object-contain p-1"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/20">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-[#eceae6]">{line.name}</p>
                      <p className="text-xs text-[#6b6560]">× {line.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[#b8973f]">
                      {formatCOP(line.price * line.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
                <span className="text-sm text-[#9a968f]">Total</span>
                <span className="tienda-display text-2xl font-semibold tabular-nums text-[#b8973f]">
                  {formatCOP(subtotal)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <TiendaFooter />
    </div>
  )
}
