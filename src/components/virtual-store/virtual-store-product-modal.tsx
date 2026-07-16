'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ImageIcon, Package, DollarSign } from 'lucide-react'
import type { Product } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const inputBase =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

function formatNumber(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue) || numValue === 0) return ''
  return numValue.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function parseFormattedNumber(value: string): number {
  const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
  return parseFloat(cleanValue) || 0
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

type VirtualStoreProductModalProps = {
  isOpen: boolean
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

export function VirtualStoreProductModal({
  isOpen,
  product,
  onClose,
  onSaved,
}: VirtualStoreProductModalProps) {
  const [mounted, setMounted] = useState(false)
  const [onlinePrice, setOnlinePrice] = useState(0)
  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!product) return
    setOnlinePrice(product.onlinePrice || 0)
    setCatalogImageUrl(product.imageUrl?.trim() || null)
    setUploadPreview(null)
  }, [product])

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setUploadPreview(blobUrl)
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/storage/upload-product-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al subir')
      const url = typeof json.url === 'string' ? json.url.trim() : ''
      if (!url) throw new Error('El servidor no devolvió la URL de la imagen')
      setCatalogImageUrl(url)
      toast.success('Imagen guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!product) return
    if (onlinePrice <= 0) {
      toast.error('Indica un precio tienda virtual mayor a 0')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/products/${product.id}/virtual-store`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlinePrice,
          imageUrl: catalogImageUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar')
      toast.success('Catálogo web actualizado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !product || !mounted) return null

  const previewSrc = uploadPreview || catalogImageUrl

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tienda virtual</p>
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</h2>
            <p className="truncate font-mono text-xs text-zinc-500">{product.reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              {previewSrc ? (
                <Image src={previewSrc} alt={product.name} fill className="object-contain p-3" sizes="220px" />
              ) : (
                <Package className="h-16 w-16 text-zinc-300" strokeWidth={1} />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage || saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-1.5 h-4 w-4" />
                {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
              </Button>
              {catalogImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploadingImage || saving}
                  onClick={() => setCatalogImageUrl(null)}
                >
                  Quitar imagen
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2 text-zinc-500">
              <DollarSign className="h-4 w-4" />
              <span>Precio por mayor (referencia)</span>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCOP(product.price)}
            </p>
          </div>

          <div>
            <label htmlFor="virtual-online-price" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Precio tienda virtual <span className="text-zinc-400">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400">
                $
              </span>
              <input
                id="virtual-online-price"
                type="text"
                value={formatNumber(onlinePrice)}
                onChange={(e) => setOnlinePrice(parseFormattedNumber(e.target.value))}
                className={cn(inputBase, 'pl-8')}
                placeholder="0"
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Este es el precio que verán los clientes en /tienda.
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave} disabled={saving || uploadingImage}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
