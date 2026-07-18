'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, DollarSign, CreditCard, Banknote, Shuffle, Upload } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUser } from '@/lib/store-helper'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { supabase } from '@/lib/supabase'
import { compressImageForUpload } from '@/lib/compress-image-for-upload'
import { cn } from '@/lib/utils'
import { MODAL_BACKDROP_PAD } from '@/config/modal-layout'
import { toast } from 'sonner'

function paymentReceiptStoredToPublicUrl(stored: string): string {
  const s = stored.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '').replace(/^supplier-invoices\//, '')
  if (!path) return ''
  return supabase.storage.from('supplier-invoices').getPublicUrl(path).data.publicUrl
}

interface SupplierPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: SupplierInvoice | null
  onAddPayment: () => void
}

const PAYMENT_PANEL =
  'flex w-full max-w-lg max-h-[calc(100dvh-2.5rem)] flex-col overflow-hidden rounded-2xl shadow-2xl'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

export function SupplierPaymentModal({
  isOpen,
  onClose,
  invoice,
  onAddPayment,
}: SupplierPaymentModalProps) {
  const { user } = useAuth()
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'mixed'>('transfer')
  const [cashStr, setCashStr] = useState('')
  const [transferStr, setTransferStr] = useState('')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const formatNumber = (value: string): string => {
    const numeric = value.replace(/[^\d]/g, '')
    if (!numeric) return ''
    return parseInt(numeric, 10).toLocaleString('es-CO')
  }

  const parseAmount = (value: string) => parseFloat(value.replace(/[^\d]/g, '')) || 0

  useEffect(() => {
    if (isOpen) {
      setAmountStr('')
      setPaymentMethod('transfer')
      setCashStr('')
      setTransferStr('')
      setNotes('')
      setImageUrl(null)
      setUploadPreview(null)
      setUploading(false)
      setError('')
      setSubmitting(false)
    }
  }, [isOpen, invoice?.id])

  const receiptPublicUrl = imageUrl ? paymentReceiptStoredToPublicUrl(imageUrl) : ''

  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setUploadPreview(blobUrl)
    setUploading(true)
    try {
      const prepared = await compressImageForUpload(file)
      const fd = new FormData()
      fd.append('file', prepared)
      const res = await fetch('/api/storage/upload-supplier-payment-receipt', {
        method: 'POST',
        body: fd,
      })
      const text = await res.text()
      let json: { error?: string; url?: string; path?: string } = {}
      try {
        json = text ? (JSON.parse(text) as typeof json) : {}
      } catch {
        throw new Error(
          res.status === 413
            ? 'La imagen supera el máximo de 2 MB. Intenta con otra foto.'
            : 'No se pudo procesar la respuesta del servidor al subir la imagen.'
        )
      }
      if (!res.ok) throw new Error(json.error || 'Error al subir')
      const path = typeof json.path === 'string' ? json.path.trim() : ''
      const url = typeof json.url === 'string' ? json.url.trim() : ''
      const stored = path || url
      if (!stored) throw new Error('El servidor no devolvió la ruta ni la URL de la imagen')
      setImageUrl(stored)
      toast.success('Comprobante del abono subido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
      setImageUrl(null)
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!isOpen || !invoice) return null

  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amount = parseAmount(amountStr)
    if (amount <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    if (amount > pending + 0.01) {
      setError(`El monto no puede superar ${pending.toLocaleString('es-CO')} COP pendientes`)
      return
    }
    let cashAmount: number | undefined
    let transferAmount: number | undefined
    if (paymentMethod === 'mixed') {
      const c = parseAmount(cashStr)
      const t = parseAmount(transferStr)
      if (c <= 0 || t <= 0) {
        setError('Indica cuánto es en efectivo y cuánto en transferencia (ambos mayores a 0)')
        return
      }
      if (Math.abs(c + t - amount) > 0.01) {
        setError('La suma de efectivo y transferencia debe ser igual al monto del abono')
        return
      }
      cashAmount = c
      transferAmount = t
    }
    let userId = user?.id
    let userName = user?.name
    if (!userId) {
      const u = getCurrentUser()
      userId = u?.id
      userName = u?.name || userName
    }
    if (!userId) {
      setError('No se pudo identificar el usuario')
      return
    }
    setSubmitting(true)
    try {
      await SupplierInvoicesService.addPayment({
        invoiceId: invoice.id,
        amount,
        paymentMethod,
        cashAmount,
        transferAmount,
        notes: notes.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
        userId,
        userName: userName || 'Usuario',
      })
      onAddPayment()
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === 'object' &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Error al registrar el abono'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n)

  const methodOptions = [
    {
      v: 'transfer' as const,
      label: 'Transferencia',
      Icon: CreditCard,
      active: 'bg-sky-600 text-white shadow-md ring-2 ring-sky-500/35 dark:bg-sky-500',
    },
    {
      v: 'cash' as const,
      label: 'Efectivo',
      Icon: Banknote,
      active: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 dark:bg-emerald-500',
    },
    {
      v: 'mixed' as const,
      label: 'Mixto',
      Icon: Shuffle,
      active: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-500/30 dark:bg-amber-500',
    },
  ]

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-60',
        MODAL_BACKDROP_PAD
      )}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950',
          PAYMENT_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-payment-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-2.5">
            <DollarSign
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="supplier-payment-modal-title"
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                Registrar abono
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-300">
                {invoice.supplierName} · {invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 dark:bg-zinc-950">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700/80 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Pendiente</span>
                <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {formatCurrency(pending)}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="supplier-abono-monto"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Monto del abono <span className="text-red-500">*</span>
              </label>
              <input
                id="supplier-abono-monto"
                value={amountStr}
                onChange={(e) => setAmountStr(formatNumber(e.target.value))}
                className={cn(inputClass, 'h-12 text-lg font-semibold tabular-nums')}
                placeholder="Ej: 500000"
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Máximo: {formatCurrency(pending)}
              </p>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Método <span className="text-red-500">*</span>
              </span>
              <div className="flex gap-1.5 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
                {methodOptions.map(({ v, label, Icon, active }) => {
                  const selected = paymentMethod === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(v)
                        if (v !== 'mixed') {
                          setCashStr('')
                          setTransferStr('')
                        }
                      }}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-[2.875rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:text-sm',
                        selected
                          ? active
                          : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      <span className="leading-tight">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {paymentMethod === 'mixed' && (
              <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Desglose del abono mixto
                </p>
                <div>
                  <label
                    htmlFor="supplier-abono-cash"
                    className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    Monto en efectivo
                  </label>
                  <input
                    id="supplier-abono-cash"
                    value={cashStr}
                    onChange={(e) => setCashStr(formatNumber(e.target.value))}
                    className={cn(inputClass, 'h-11 text-base tabular-nums')}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label
                    htmlFor="supplier-abono-transfer"
                    className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
                    Monto en transferencia
                  </label>
                  <input
                    id="supplier-abono-transfer"
                    value={transferStr}
                    onChange={(e) => setTransferStr(formatNumber(e.target.value))}
                    className={cn(inputClass, 'h-11 text-base tabular-nums')}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                {amountStr && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Total abono:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseAmount(amountStr))}
                    </span>
                    {' · '}
                    Suma desglose:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseAmount(cashStr) + parseAmount(transferStr))}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="supplier-abono-notas"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Notas <span className="font-normal text-zinc-500">(opcional)</span>
              </label>
              <textarea
                id="supplier-abono-notas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones sobre el abono…"
                className={cn(inputClass, 'min-h-[4rem] resize-y')}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Comprobante <span className="font-normal text-zinc-500">(opcional)</span>
              </span>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Foto del recibo o transferencia. Máx. 2 MB.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-sky-500/40 bg-sky-500/[0.06] px-3 py-2.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-500/10 dark:border-sky-400/40 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15">
                  <Upload className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptFile}
                    disabled={uploading || submitting}
                  />
                </label>
                {receiptPublicUrl && (
                  <>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 underline-offset-4 hover:underline dark:text-red-400"
                      onClick={() => {
                        setImageUrl(null)
                        setUploadPreview(null)
                      }}
                    >
                      Quitar
                    </button>
                    <a
                      href={receiptPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                    >
                      Abrir
                    </a>
                  </>
                )}
              </div>
              {(uploadPreview || receiptPublicUrl) && (
                <div className="relative mt-2 max-h-[min(28dvh,180px)] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80">
                  {uploading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                      Subiendo…
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview || receiptPublicUrl || ''}
                    alt="Vista previa del comprobante de abono"
                    className="mx-auto block h-auto max-h-[min(28dvh,180px)] w-full object-contain"
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || uploading}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {submitting ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
