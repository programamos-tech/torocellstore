'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, Clock, Loader2, Upload } from 'lucide-react'
import type { TiendaWebOrderSummary } from '@/lib/tienda-orders-service'
import { compressImageForUpload } from '@/lib/compress-image-for-upload'
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

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function OrderConfirmationClient({
  orderId,
  token,
  initialOrder
}: {
  orderId: string
  token: string
  initialOrder: TiendaWebOrderSummary | null
}) {
  const [order, setOrder] = useState<TiendaWebOrderSummary | null>(initialOrder)
  const [now, setNow] = useState(() => Date.now())
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const deadlineMs = order ? new Date(order.paymentProofDeadline).getTime() - now : 0
  const expired = deadlineMs <= 0
  const hasProof = Boolean(order?.paymentProofUploadedAt && order?.paymentProofUrl)

  const statusLabel = useMemo(() => {
    if (!order) return ''
    if (order.status === 'completed') return 'Pedido confirmado en tienda'
    if (hasProof) return 'Comprobante recibido — en revisión'
    if (expired) return 'Tiempo de comprobante expirado'
    return 'Esperando comprobante de pago'
  }, [order, hasProof, expired])

  const handleUpload = useCallback(
    async (file: File) => {
      if (!order || hasProof || expired) return
      setUploading(true)
      setUploadError(null)
      try {
        const compressed = await compressImageForUpload(file)
        const formData = new FormData()
        formData.append('token', token)
        formData.append('file', compressed)

        const res = await fetch(`/api/tienda/orders/${orderId}/payment-proof`, {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo subir el comprobante')
        }
        setOrder(data.order)
        setPreview(null)
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Error al subir')
      } finally {
        setUploading(false)
      }
    },
    [order, hasProof, expired, token, orderId]
  )

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TiendaAnnouncementBar />
        <TiendaHeader />
        <main className="mx-auto flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-lg font-medium text-[#E8F2F5]">Pedido no encontrado</p>
          <Link href="/tienda" className="tienda-btn-gold mt-6 inline-flex h-10 items-center rounded-full px-8 text-sm font-semibold">
            Ir al catálogo
          </Link>
        </main>
        <TiendaFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TiendaAnnouncementBar />
      <TiendaHeader storeName={order.storeName} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#F7BE4B]" strokeWidth={1.25} />
          <h1 className="tienda-display mt-4 text-3xl font-semibold text-[#E8F2F5]">¡Pedido registrado!</h1>
          <p className="mt-2 text-sm text-[#9DC2D1]">
            Pedido <span className="font-mono text-[#9DC2D1]">{order.invoiceNumber}</span> · {order.clientName}
          </p>
          <p className="tienda-display mt-3 text-2xl font-semibold tabular-nums text-[#F7BE4B]">
            {formatCOP(order.total)}
          </p>
        </div>

        <div className="tienda-card-premium mt-8 rounded-2xl p-5 sm:p-6">
          <p className="text-center text-sm font-medium text-[#E8F2F5]">{statusLabel}</p>

          {!hasProof && !expired && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#F7BE4B]">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold tabular-nums">
                Tiempo restante: {formatCountdown(deadlineMs)}
              </span>
            </div>
          )}

          <dl className="mt-6 space-y-2 border-t border-white/[0.08] pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#6B8A96]">Banco</dt>
              <dd className="text-[#E8F2F5]">{order.bank.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#6B8A96]">Cuenta {order.bank.accountType}</dt>
              <dd className="font-mono text-[#E8F2F5]">{order.bank.accountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#6B8A96]">Titular</dt>
              <dd className="text-right text-[#E8F2F5]">{order.bank.accountHolder}</dd>
            </div>
          </dl>

          {!hasProof && !expired && (
            <div className="mt-6">
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 transition-colors',
                  uploading ? 'pointer-events-none opacity-60' : 'hover:border-[#F7BE4B]/35 hover:bg-white/[0.05]'
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPreview(URL.createObjectURL(file))
                    void handleUpload(file)
                  }}
                />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#F7BE4B]" />
                ) : (
                  <Upload className="h-8 w-8 text-[#9DC2D1]" strokeWidth={1.5} />
                )}
                <span className="mt-3 text-sm font-medium text-[#E8F2F5]">
                  {uploading ? 'Subiendo comprobante…' : 'Subir comprobante de transferencia'}
                </span>
                <span className="mt-1 text-xs text-[#6B8A96]">JPG o PNG · máx. 2 MB</span>
              </label>
              {preview && !uploading && (
                <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#111]">
                  <Image src={preview} alt="Vista previa" fill className="object-contain" unoptimized />
                </div>
              )}
              {uploadError && (
                <p className="mt-3 text-center text-sm text-rose-400">{uploadError}</p>
              )}
            </div>
          )}

          {hasProof && order.paymentProofUrl && (
            <div className="mt-6">
              <p className="mb-2 text-center text-xs text-[#9DC2D1]">Comprobante enviado</p>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#111]">
                <Image
                  src={order.paymentProofUrl}
                  alt="Comprobante de pago"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="mt-4 text-center text-sm text-[#9DC2D1]">
                Tu pedido quedó en ventas como pendiente. Te contactaremos para confirmar envío o entrega.
              </p>
            </div>
          )}

          {expired && !hasProof && (
            <p className="mt-6 text-center text-sm text-[#9DC2D1]">
              El plazo para subir el comprobante terminó. Escríbenos por WhatsApp con tu número de pedido{' '}
              <span className="font-mono text-[#9DC2D1]">{order.invoiceNumber}</span>.
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/tienda"
            className="tienda-btn-outline-gold inline-flex h-11 items-center rounded-full px-8 text-sm font-semibold"
          >
            Seguir comprando
          </Link>
        </div>
      </main>

      <TiendaFooter />
    </div>
  )
}
