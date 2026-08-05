'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Ban, Loader2, ShieldAlert, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MODAL_BACKDROP_PAD } from '@/config/modal-layout'
import { ProductsService, type ProductDeletionCheck } from '@/lib/products-service'
import { Product } from '@/types'

interface DeleteProductModalProps {
  isOpen: boolean
  product: Product | null
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

const PANEL = 'flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl'

export function DeleteProductModal({ isOpen, product, onClose, onConfirm }: DeleteProductModalProps) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [check, setCheck] = useState<ProductDeletionCheck | null>(null)
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const productId = product?.id

  useEffect(() => {
    if (!isOpen || !productId) return
    setStep(1)
    setCheck(null)
    setDeleting(false)
    setLoadingCheck(true)
    let cancelled = false
    ProductsService.checkProductDeletion(productId)
      .then((result) => {
        if (!cancelled) setCheck(result)
      })
      .finally(() => {
        if (!cancelled) setLoadingCheck(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, productId])

  const handleClose = useCallback(() => {
    if (deleting) return
    onClose()
  }, [deleting, onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  if (!isOpen || !mounted || !product) return null

  const blockers = check?.blockers ?? []
  const warnings = check?.warnings ?? []
  const isBlocked = blockers.length > 0
  const hasHistory = (check?.salesCount ?? 0) > 0 || (check?.warrantiesCount ?? 0) > 0

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-60',
        MODAL_BACKDROP_PAD
      )}
      role="presentation"
      onClick={handleClose}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
          PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-2.5">
            {isBlocked ? (
              <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" strokeWidth={1.75} aria-hidden />
            ) : step === 1 ? (
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" strokeWidth={1.75} aria-hidden />
            )}
            <div className="min-w-0">
              <h2
                id="delete-product-title"
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {isBlocked
                  ? 'No se puede eliminar'
                  : step === 1
                    ? 'Eliminar producto'
                    : 'Confirmación final'}
              </h2>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {product.reference ? `${product.reference} · ` : ''}
                {product.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
          {loadingCheck ? (
            <div className="flex items-center gap-2 py-4 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Revisando créditos, ventas y garantías asociadas…
            </div>
          ) : step === 1 ? (
            <>
              {isBlocked && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Este producto tiene movimientos abiertos:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300/90">
                    {blockers.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/70">
                    Cierra o cancela esos movimientos y deja el stock en 0 para poder eliminarlo.
                  </p>
                </div>
              )}

              {!isBlocked && warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Ten en cuenta antes de seguir:</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300/90">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isBlocked && warnings.length === 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Este producto no tiene créditos, ventas ni garantías asociadas.
                </p>
              )}

              {!isBlocked && (
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Vas a eliminar <span className="font-medium text-zinc-900 dark:text-zinc-100">{product.name}</span> del
                  catálogo. Esta acción no se puede deshacer.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Segunda confirmación: esto es permanente.
                </p>
                <p className="mt-1.5 text-sm text-red-700 dark:text-red-300/90">
                  Se eliminará <span className="font-semibold">{product.name}</span>
                  {product.reference ? ` (ref. ${product.reference})` : ''} del catálogo
                  {hasHistory ? ' y desaparecerá del detalle de las facturas y garantías donde aparece.' : '.'}
                </p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ¿Confirmas que quieres eliminarlo definitivamente?
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          {isBlocked ? (
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Entendido
            </Button>
          ) : step === 1 ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={loadingCheck}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} disabled={deleting}>
                Volver
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={handleConfirm} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                    Sí, eliminar definitivamente
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
