'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Banknote,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Split,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Client, Product, SaleItem, SalePayment } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'

const PAGE_SIZE = 16

const posInputClass =
  'w-full rounded-xl border-2 border-zinc-200 bg-white px-3 py-3 text-lg font-semibold tabular-nums text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-emerald-500'

const PAYMENT_OPTIONS = [
  { id: 'cash' as const, label: 'Efectivo', icon: Banknote },
  { id: 'transfer' as const, label: 'Transferencia', icon: Wallet },
  { id: 'mixed' as const, label: 'Mixto', icon: Split },
]

export interface PosSaleViewProps {
  onBack: () => void
  onSwitchToClassic: () => void
  invoiceNumber: string
  orderedSelectedProducts: SaleItem[]
  orderedValidProducts: SaleItem[]
  selectedClient: Client | null
  clientSearch: string
  setClientSearch: (value: string) => void
  showClientDropdown: boolean
  setShowClientDropdown: (value: boolean) => void
  filteredClients: Client[]
  setSelectedClient: (client: Client | null) => void
  handleRemoveClient: () => void
  getClientTypeColor: (type: string) => string
  productSearch: string
  setProductSearch: (value: string) => void
  isSearchingProducts: boolean
  gridProducts: Product[]
  loadingBestsellers?: boolean
  onAddProduct: (product: Product) => void
  onRemoveProduct: (itemId: string) => void
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onUpdatePrice: (itemId: string, newPrice: number) => void
  onPriceBlur: (itemId: string) => void
  formatInputNumber: (value: number) => string
  parseInputNumber: (value: string) => number
  findProductById: (productId: string) => Product | undefined
  paymentMethod: 'cash' | 'transfer' | 'warranty' | 'mixed' | ''
  setPaymentMethod: (value: 'cash' | 'transfer' | 'warranty' | 'mixed' | '') => void
  showMixedPayments: boolean
  mixedPayments: SalePayment[]
  updateMixedPayment: (index: number, field: keyof SalePayment, value: unknown) => void
  paymentError: string
  getPaymentTypeLabel: (type: string) => string
  getTotalMixedPayments: () => number
  receivedAmount: string
  setReceivedAmount: (value: string) => void
  total: number
  formatCurrency: (amount: number) => string
  handleSave: () => void
  isCreating: boolean
  canSave: boolean
  saleBlockingAlert: React.ReactNode
  validProducts: SaleItem[]
}

function ProductTile({
  product,
  onAdd,
  rank,
}: {
  product: Product
  onAdd: (product: Product) => void
  rank?: number
}) {
  const stock = (product.stock?.store || 0) + (product.stock?.warehouse || 0)
  const hasStock = stock > 0
  const hasImage = Boolean(product.imageUrl?.trim())

  return (
    <button
      type="button"
      disabled={!hasStock}
      onClick={() => hasStock && onAdd(product)}
      className={cn(
        'relative flex min-h-[88px] touch-manipulation flex-col rounded-xl border p-2 text-left transition-all active:scale-[0.98]',
        hasStock
          ? 'border-zinc-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/20'
          : 'cursor-not-allowed border-zinc-200/60 bg-zinc-100/80 opacity-60 dark:border-zinc-800 dark:bg-zinc-950/60'
      )}
    >
      {rank != null && rank <= 3 && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950">
          {rank}
        </span>
      )}
      <div className="mb-1.5 flex h-10 w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl!} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
        )}
      </div>
      <div className="line-clamp-2 min-h-[2rem] text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
        {product.name}
      </div>
      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
        <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
          {product.reference || '—'}
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
          {(product.price || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </span>
      </div>
    </button>
  )
}

export function PosSaleView({
  onBack,
  onSwitchToClassic,
  invoiceNumber,
  orderedSelectedProducts,
  orderedValidProducts,
  selectedClient,
  clientSearch,
  setClientSearch,
  showClientDropdown,
  setShowClientDropdown,
  filteredClients,
  setSelectedClient,
  handleRemoveClient,
  getClientTypeColor,
  productSearch,
  setProductSearch,
  isSearchingProducts,
  gridProducts,
  loadingBestsellers = false,
  onAddProduct,
  onRemoveProduct,
  onUpdateQuantity,
  onUpdatePrice,
  onPriceBlur,
  formatInputNumber,
  parseInputNumber,
  findProductById,
  paymentMethod,
  setPaymentMethod,
  showMixedPayments,
  mixedPayments,
  updateMixedPayment,
  paymentError,
  getPaymentTypeLabel,
  getTotalMixedPayments,
  receivedAmount,
  setReceivedAmount,
  total,
  formatCurrency,
  handleSave,
  isCreating,
  canSave,
  saleBlockingAlert,
  validProducts,
}: PosSaleViewProps) {
  const [page, setPage] = useState(0)

  const isSearchMode = productSearch.trim().length > 0
  const mixedTotal = getTotalMixedPayments()
  const mixedDiff = Math.round(total) - Math.round(mixedTotal)
  const receivedNumeric = parseInt(receivedAmount.replace(/[^\d]/g, '') || '0', 10)
  const changeAmount = receivedNumeric - total

  const displayProducts = useMemo(() => {
    if (isSearchMode) return gridProducts
    return gridProducts.filter((p) => {
      if (p.status !== 'active') return false
      return (p.stock?.store || 0) + (p.stock?.warehouse || 0) > 0
    })
  }, [gridProducts, isSearchMode])

  const totalPages = Math.max(1, Math.ceil(displayProducts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageProducts = displayProducts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="zonat-preserve-surface flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950 md:px-4">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} className="shrink-0" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50 md:text-lg">
              Factura · Modo POS
            </h1>
            <StoreBadge />
          </div>
          {invoiceNumber !== 'Pendiente' && invoiceNumber !== 'Generando...' && (
            <p className="font-mono text-[10px] text-zinc-500">{invoiceNumber}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToClassic}
          className="shrink-0 touch-manipulation text-xs"
        >
          <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
          Modo clásico
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,36%)_1fr]">
        {/* Panel izquierdo: carrito + cliente + cobro */}
        <aside className="zonat-preserve-surface flex min-h-0 flex-col border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:border-b-0 lg:border-r">
          <div className="shrink-0 space-y-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                <div className="flex min-w-0 items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedClient.name}
                  </span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRemoveClient}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  className={cn(inputClass, 'pl-10 py-2 text-sm')}
                />
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setSelectedClient(client)
                          setClientSearch(client.name)
                          setShowClientDropdown(false)
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      >
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {client.name}
                        </span>
                        <Badge className={cn(getClientTypeColor(client.type), 'text-[10px]')}>
                          {client.type === 'mayorista' ? 'May.' : client.type === 'minorista' ? 'Min.' : 'CF'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Carrito</span>
              <Badge variant="outline" className="text-[10px]">
                {orderedSelectedProducts.length}
              </Badge>
            </div>
            {orderedSelectedProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-40" />
                Toca productos para agregar
              </div>
            ) : (
              <ul className="space-y-2">
                {orderedSelectedProducts.map((item) => {
                  const product = findProductById(item.productId)
                  const catalogPrice = product?.price ?? item.unitPrice
                  const priceAdjusted = item.unitPrice !== catalogPrice
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/40"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.productName}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Ref: {item.productReferenceCode || product?.reference || '—'}
                            {priceAdjusted && (
                              <span className="ml-1 text-amber-700 dark:text-amber-400">
                                · Lista {formatCurrency(catalogPrice)}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(item.id)}
                          className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label="Quitar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <label className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          Precio
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatInputNumber(item.unitPrice)}
                          onChange={(e) => {
                            const numericValue = parseInputNumber(e.target.value)
                            if (numericValue >= 0) onUpdatePrice(item.id, numericValue)
                          }}
                          onBlur={() => onPriceBlur(item.id)}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-semibold tabular-nums text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          aria-label={`Precio de ${item.productName}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 touch-manipulation p-0"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-[2rem] text-center text-base font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 touch-manipulation p-0"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Método de pago
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(id)
                      if (id !== 'cash') setReceivedAmount('')
                    }}
                    className={cn(
                      'flex touch-manipulation flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-3 text-center transition-all active:scale-[0.98]',
                      paymentMethod === id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    <span className="text-[11px] font-bold leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'cash' && validProducts.length > 0 && (
              <div className="space-y-2 rounded-2xl border-2 border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Dinero recibido
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={receivedAmount ? receivedNumeric.toLocaleString('es-CO') : ''}
                  onChange={(e) => setReceivedAmount(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                  className={cn(posInputClass, 'text-center text-2xl')}
                />
                {receivedNumeric > 0 && (
                  <div
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-center',
                      changeAmount >= 0
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Vuelto</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(changeAmount)}</p>
                  </div>
                )}
              </div>
            )}

            {showMixedPayments && (
              <div className="space-y-3 rounded-2xl border-2 border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mixedPayments.map((payment, index) => (
                    <div key={index}>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {getPaymentTypeLabel(payment.paymentType)}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={payment.amount ? payment.amount.toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/[^\d]/g, '')
                          updateMixedPayment(index, 'amount', parseInt(cleanValue, 10) || 0)
                        }}
                        className={cn(posInputClass, 'text-center text-xl sm:text-2xl')}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div
                  className={cn(
                    'rounded-xl px-3 py-3 text-center',
                    mixedDiff === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : 'bg-amber-50 dark:bg-amber-950/30'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      Ingresado:{' '}
                      <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(mixedTotal)}</strong>
                    </span>
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      Total:{' '}
                      <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(total)}</strong>
                    </span>
                  </div>
                  {mixedDiff !== 0 && (
                    <p
                      className={cn(
                        'mt-1 text-base font-bold tabular-nums',
                        mixedDiff > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'
                      )}
                    >
                      {mixedDiff > 0 ? `Faltan ${formatCurrency(mixedDiff)}` : `Sobran ${formatCurrency(Math.abs(mixedDiff))}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {paymentError && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {paymentError}
              </p>
            )}

            <div className="rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total a cobrar</p>
              <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatCurrency(total)}
              </p>
            </div>

            {saleBlockingAlert}

            <Button
              type="button"
              size="lg"
              disabled={!canSave || isCreating}
              onClick={handleSave}
              className="h-14 w-full touch-manipulation rounded-xl bg-emerald-600 text-base font-bold hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {isCreating ? 'Procesando…' : `COBRAR ${formatCurrency(total)}`}
            </Button>
            {validProducts.some((item) => !item.unitPrice || item.unitPrice <= 0) && (
              <p className="text-center text-[10px] text-amber-700 dark:text-amber-400">
                Hay productos sin precio asignado
              </p>
            )}
          </div>
        </aside>

        {/* Panel derecho: búsqueda + más vendidos + rejilla */}
        <section className="flex min-h-0 flex-col p-3 md:p-4">
          <div className="relative mb-3 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, referencia o marca…"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value)
                setPage(0)
              }}
              className={cn(inputClass, 'py-3 pl-11 text-base')}
            />
          </div>

          {!isSearchMode && (
            <div className="mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/25">
              <TrendingUp className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Más vendidos</p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                  Últimos 90 días · usa la búsqueda para el resto del catálogo
                </p>
              </div>
            </div>
          )}

          <div className="mb-2 flex shrink-0 items-center justify-between text-xs text-zinc-500">
            <span>
              {isSearchMode
                ? isSearchingProducts
                  ? 'Buscando…'
                  : `${displayProducts.length} resultado(s)`
                : loadingBestsellers
                  ? 'Cargando más vendidos…'
                  : `${displayProducts.length} más vendidos con stock`}
            </span>
            {!isSearchMode && totalPages > 1 && (
              <span>
                Pág. {safePage + 1} / {totalPages}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isSearchingProducts || loadingBestsellers ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
              </div>
            ) : pageProducts.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-sm text-zinc-500">
                <Package className="mb-2 h-10 w-10 opacity-40" />
                {isSearchMode
                  ? 'Sin resultados'
                  : 'Sin ventas recientes con stock. Busca por referencia arriba.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {pageProducts.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    onAdd={onAddProduct}
                    rank={!isSearchMode ? safePage * PAGE_SIZE + index + 1 : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {!isSearchMode && totalPages > 1 && (
            <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="touch-manipulation"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="touch-manipulation"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
