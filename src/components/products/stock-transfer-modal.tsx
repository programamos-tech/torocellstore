'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ArrowRightLeft, Package, Store, Warehouse, AlertTriangle } from 'lucide-react'
import { Product, StockTransfer } from '@/types'
import { cn } from '@/lib/utils'
import { MODAL_PANEL, MODAL_BACKDROP_PAD } from '@/config/modal-layout'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

const sectionCard =
  'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50 md:p-5'

interface StockTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'userId' | 'userName'>) => void
  product: Product | null
}

export function StockTransferModal({ isOpen, onClose, onTransfer, product }: StockTransferModalProps) {
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

  const [formData, setFormData] = useState({
    fromLocation: 'warehouse' as 'warehouse' | 'store',
    toLocation: 'store' as 'warehouse' | 'store',
    quantity: 0,
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0'
    }
    if (formData.fromLocation === formData.toLocation) {
      newErrors.toLocation = 'La ubicación destino debe ser diferente a la origen'
    }
    if (product) {
      const availableStock =
        formData.fromLocation === 'warehouse' ? product.stock.warehouse : product.stock.store
      if (formData.quantity > availableStock) {
        newErrors.quantity = `No hay suficiente stock. Disponible: ${availableStock}`
      }
    }
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas un motivo, debe tener al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | number) => {
    const processedValue = field === 'quantity' && value === '' ? 0 : value
    setFormData((prev) => {
      const next = { ...prev, [field]: processedValue }
      // Si cambia el origen y coincide con destino, auto-cambia el destino
      if (field === 'fromLocation' && processedValue === prev.toLocation) {
        next.toLocation = processedValue === 'warehouse' ? 'store' : 'warehouse'
      }
      return next
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleClose = () => {
    setFormData({
      fromLocation: 'warehouse',
      toLocation: 'store',
      quantity: 0,
      reason: '',
    })
    setErrors({})
    onClose()
  }

  const handleTransfer = () => {
    if (validateForm() && product) {
      onTransfer({
        productId: product.id,
        productName: product.name,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        quantity: formData.quantity,
        reason: formData.reason.trim(),
      })
      handleClose()
    }
  }

  const getLocationLabel = (location: 'warehouse' | 'store') =>
    location === 'warehouse' ? 'Bodega' : 'Local'

  const getAvailableStock = () => {
    if (!product) return 0
    return formData.fromLocation === 'warehouse' ? product.stock.warehouse : product.stock.store
  }

  if (!isOpen || !product || !portalReady || typeof document === 'undefined') {
    return null
  }

  const stockAfterWarehouse =
    formData.fromLocation === 'warehouse'
      ? product.stock.warehouse - formData.quantity
      : product.stock.warehouse + (formData.toLocation === 'warehouse' ? formData.quantity : 0)

  const stockAfterStore =
    formData.fromLocation === 'store'
      ? product.stock.store - formData.quantity
      : product.stock.store + (formData.toLocation === 'store' ? formData.quantity : 0)

  const locationButton = (
    location: 'warehouse' | 'store',
    selected: boolean,
    disabled: boolean,
    onSelect: () => void
  ) => {
    const isWarehouse = location === 'warehouse'
    const Icon = isWarehouse ? Warehouse : Store
    const selectedClass = isWarehouse
      ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-500/35 dark:bg-sky-500 dark:ring-sky-400/40'
      : 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 dark:bg-emerald-500 dark:ring-emerald-400/40'

    return (
      <button
        key={location}
        type="button"
        onClick={() => !disabled && onSelect()}
        disabled={disabled}
        aria-pressed={selected}
        className={cn(
          'flex min-h-[3rem] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all',
          disabled
            ? 'cursor-not-allowed bg-zinc-100/80 text-zinc-400 opacity-60 dark:bg-zinc-800/40 dark:text-zinc-500'
            : selected
              ? selectedClass
              : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block">{getLocationLabel(location)}</span>
          <span className={cn('block text-[11px] font-medium', selected && !disabled ? 'opacity-90' : 'opacity-70')}>
            Stock: {formatNumber(isWarehouse ? product.stock.warehouse : product.stock.store)}
          </span>
        </span>
      </button>
    )
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-56',
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
        aria-labelledby="stock-transfer-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-4 md:px-6 md:py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-3">
            <ArrowRightLeft
              className="mt-0.5 h-6 w-6 shrink-0 text-sky-600 dark:text-sky-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="stock-transfer-title"
                className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white md:text-xl"
              >
                Transferir stock
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {product.name} · {product.reference}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            handleTransfer()
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-4 md:px-6 md:py-5 dark:bg-zinc-950">
            <div className={sectionCard}>
              <div className="mb-4 flex items-center gap-2">
                <ArrowRightLeft
                  className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Detalles de la transferencia
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div>
                  <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Desde <span className="text-red-500">*</span>
                  </span>
                  <div className="space-y-1.5 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
                    {locationButton('warehouse', formData.fromLocation === 'warehouse', false, () =>
                      handleInputChange('fromLocation', 'warehouse')
                    )}
                    {locationButton('store', formData.fromLocation === 'store', false, () =>
                      handleInputChange('fromLocation', 'store')
                    )}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hacia <span className="text-red-500">*</span>
                  </span>
                  <div className="space-y-1.5 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
                    {locationButton(
                      'warehouse',
                      formData.toLocation === 'warehouse',
                      formData.fromLocation === 'warehouse',
                      () => handleInputChange('toLocation', 'warehouse')
                    )}
                    {locationButton(
                      'store',
                      formData.toLocation === 'store',
                      formData.fromLocation === 'store',
                      () => handleInputChange('toLocation', 'store')
                    )}
                  </div>
                  {errors.toLocation && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.toLocation}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div>
                  <label
                    htmlFor="transfer-qty"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Cantidad a transferir <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="transfer-qty"
                    type="number"
                    min={1}
                    max={getAvailableStock()}
                    value={formData.quantity || ''}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value, 10) || 0)}
                    className={cn(inputClass, errors.quantity && 'border-red-500/70 ring-1 ring-red-500/30')}
                    placeholder="Ej: 2"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Máximo disponible: {formatNumber(getAvailableStock())}
                  </p>
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="transfer-reason"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Motivo <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                  <textarea
                    id="transfer-reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className={cn(
                      inputClass,
                      'min-h-[4.5rem] resize-y',
                      errors.reason && 'border-red-500/70 ring-1 ring-red-500/30'
                    )}
                    placeholder="Ej: Reposición de tienda, devolución a bodega…"
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
                      {formData.reason.length > 0 ? `${formData.reason.length}/10` : 'Opcional'}
                    </span>
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
                  Resumen de la transferencia
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    Producto
                  </div>
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{product.name}</div>
                </div>

                <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
                  <div className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">Transferir</div>
                  <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formData.quantity > 0 ? `${formatNumber(formData.quantity)} und.` : '0 und.'}
                  </div>
                </div>

                <div className="rounded-lg border border-sky-500/25 bg-sky-500/[0.06] p-3 dark:border-sky-400/30 dark:bg-sky-500/10">
                  <div className="mb-1 text-xs font-medium text-sky-700 dark:text-sky-300">Stock después</div>
                  <div className="text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                    Bodega: {formatNumber(stockAfterWarehouse)}
                  </div>
                  <div className="text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                    Local: {formatNumber(stockAfterStore)}
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                  <div className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">De → A</div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {getLocationLabel(formData.fromLocation)} → {getLocationLabel(formData.toLocation)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-950">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Transferir stock
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
