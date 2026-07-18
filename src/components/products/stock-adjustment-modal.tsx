'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Package, AlertTriangle, Warehouse, Store, TrendingUp, TrendingDown, FileText } from 'lucide-react'
import { Product } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { MODAL_PANEL, MODAL_BACKDROP_PAD } from '@/config/modal-layout'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

const sectionCard =
  'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50 md:p-5'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdjust: (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => Promise<void>
  product?: Product | null
}

export function StockAdjustmentModal({ isOpen, onClose, onAdjust, product }: StockAdjustmentModalProps) {
  const { user } = useAuth()
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [isOpen])

  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  const [formData, setFormData] = useState({
    location: 'store' as 'warehouse' | 'store',
    newQuantity: 0,
    reason: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0'
    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    return numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  const parseFormattedNumber = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
    return parseFloat(cleanValue) || 0
  }

  useEffect(() => {
    if (product) {
      setFormData({ location: 'store', newQuantity: 0, reason: '' })
      setErrors({})
    }
  }, [product])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    const newErrors: Record<string, string> = {}
    if (formData.newQuantity < 0) {
      newErrors.newQuantity = 'La cantidad no puede ser negativa'
    }
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas una razón, debe tener al menos 10 caracteres'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onAdjust(product.id, formData.location, formData.newQuantity, formData.reason)
    } catch (error) {
      console.error('Error in stock adjustment:', error)
    }
  }

  const getCurrentStock = () => {
    if (!product) return 0
    return formData.location === 'warehouse' ? product.stock.warehouse : product.stock.store
  }

  const getStockDifference = () => formData.newQuantity - getCurrentStock()

  const getLocationLabel = (location: 'warehouse' | 'store') =>
    location === 'warehouse' ? 'Bodega' : 'Local'

  if (!isOpen || !product || !portalReady || typeof document === 'undefined') {
    return null
  }

  const difference = getStockDifference()
  const hasDifference = formData.newQuantity !== getCurrentStock()

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-60',
        MODAL_BACKDROP_PAD
      )}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950',
          MODAL_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjust-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-4 md:px-6 md:py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-3">
            <Package
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="stock-adjust-title"
                className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white md:text-xl"
              >
                Ajustar stock
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Modificar inventario del producto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-4 md:px-6 md:py-5 dark:bg-zinc-950">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              <div className={sectionCard}>
                <div className="mb-4 flex items-center gap-2">
                  <FileText
                    className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Información del producto
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Producto</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{product.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Referencia</span>
                    <div className="font-mono text-sm text-zinc-900 dark:text-zinc-50">{product.reference}</div>
                  </div>
                </div>

                <div className={cn('mt-4 grid gap-3', isMainStore ? 'grid-cols-2' : 'grid-cols-1')}>
                  {isMainStore && (
                    <div className="rounded-lg border border-sky-500/25 bg-sky-500/[0.06] p-3 dark:border-sky-400/30 dark:bg-sky-500/10">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                        <Warehouse className="h-3.5 w-3.5" strokeWidth={2} />
                        Stock — Bodega
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatNumber(product.stock.warehouse)} unidades
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <Store className="h-3.5 w-3.5" strokeWidth={2} />
                      Stock — Local
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatNumber(product.stock.store)} unidades
                    </div>
                  </div>
                </div>
              </div>

              <div className={sectionCard}>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle
                    className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Configuración del ajuste
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Ubicación a ajustar <span className="text-red-500">*</span>
                    </span>
                    <div
                      className={cn(
                        'flex gap-1.5 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700',
                        isMainStore ? '' : 'max-w-xs'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleInputChange('location', 'store')}
                        aria-pressed={formData.location === 'store'}
                        className={cn(
                          'flex min-h-[2.875rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                          formData.location === 'store'
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 dark:bg-emerald-500 dark:ring-emerald-400/40'
                            : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                        )}
                      >
                        <Store className="h-4 w-4 shrink-0" strokeWidth={2} />
                        <span className="leading-tight">
                          Local
                          <span className="mt-0.5 block text-[10px] font-medium opacity-80 sm:mt-0 sm:ml-1 sm:inline">
                            ({formatNumber(product.stock.store)})
                          </span>
                        </span>
                      </button>

                      {isMainStore && (
                        <button
                          type="button"
                          onClick={() => handleInputChange('location', 'warehouse')}
                          aria-pressed={formData.location === 'warehouse'}
                          className={cn(
                            'flex min-h-[2.875rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                            formData.location === 'warehouse'
                              ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-500/35 dark:bg-sky-500 dark:ring-sky-400/40'
                              : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                          )}
                        >
                          <Warehouse className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <span className="leading-tight">
                            Bodega
                            <span className="mt-0.5 block text-[10px] font-medium opacity-80 sm:mt-0 sm:ml-1 sm:inline">
                              ({formatNumber(product.stock.warehouse)})
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="stock-new-qty"
                      className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Nueva cantidad <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="stock-new-qty"
                      type="text"
                      value={formData.newQuantity === 0 ? '' : formatNumber(formData.newQuantity)}
                      onChange={(e) => {
                        const rawValue = e.target.value.trim()
                        const numericValue = rawValue === '' ? 0 : parseFormattedNumber(rawValue)
                        handleInputChange('newQuantity', numericValue)
                      }}
                      className={cn(
                        inputClass,
                        errors.newQuantity && 'border-red-500/70 ring-1 ring-red-500/30'
                      )}
                      placeholder="Ej: 10"
                    />
                    {errors.newQuantity && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.newQuantity}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="stock-reason"
                      className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Razón del ajuste <span className="font-normal text-zinc-500">(opcional)</span>
                    </label>
                    <textarea
                      id="stock-reason"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className={cn(
                        inputClass,
                        'min-h-[4.5rem] resize-y',
                        errors.reason && 'border-red-500/70 ring-1 ring-red-500/30'
                      )}
                      placeholder="Ej: Inventario físico, producto dañado, corrección de error…"
                      rows={3}
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {errors.reason ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
                      ) : (
                        <span />
                      )}
                      <span
                        className={cn(
                          'ml-auto text-xs',
                          formData.reason.length > 0 && formData.reason.length < 10
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        )}
                      >
                        {formData.reason.length > 0
                          ? `${formData.reason.length}/10 caracteres mínimo`
                          : 'Campo opcional'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {hasDifference && (
              <div
                className={cn(
                  'mt-4 rounded-xl border p-4',
                  difference > 0
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] dark:border-emerald-400/35 dark:bg-emerald-500/10'
                    : 'border-red-500/30 bg-red-500/[0.08] dark:border-red-400/35 dark:bg-red-500/10'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Diferencia</div>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {difference > 0 ? 'Incremento' : 'Reducción'} en {getLocationLabel(formData.location)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {difference > 0 ? (
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.75} />
                    )}
                    <span
                      className={cn(
                        'text-lg font-semibold tabular-nums',
                        difference > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      )}
                    >
                      {difference > 0 ? '+' : ''}
                      {formatNumber(difference)} unidades
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-950">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
              Ajustar stock
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
