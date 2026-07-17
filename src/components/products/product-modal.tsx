'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { X, Package, DollarSign, BarChart3, AlertTriangle, Store, ImageIcon } from 'lucide-react'
import { Product, Category } from '@/types'
import { useProducts } from '@/contexts/products-context'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MODAL_PANEL, MODAL_BACKDROP_PAD } from '@/config/modal-layout'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const inputBase =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

function SectionCard({
  icon: Icon,
  title,
  children,
  description,
  iconClass = 'text-emerald-600 dark:text-emerald-400',
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  description?: string
  iconClass?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn('h-5 w-5 shrink-0', iconClass)} strokeWidth={1.75} aria-hidden />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      {description ? <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p> : null}
      {children}
    </div>
  )
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: Omit<Product, 'id'>) => void
  product?: Product | null
  categories: Category[]
}

export function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const { products } = useProducts()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  const [formData, setFormData] = useState({
    name: product?.name || '',
    reference: product?.reference || '',
    description: product?.description || '',
    price: product?.price || 0,
    onlinePrice: product?.onlinePrice || 0,
    cost: product?.cost || 0,
    stock: {
      warehouse: product?.stock?.warehouse || 0,
      store: product?.stock?.store || 0,
      total: product?.stock?.total || 0,
    },
    categoryId: product?.categoryId || '',
    brand: product?.brand || '',
    status: product?.status || 'active',
    initialLocation: 'store' as 'warehouse' | 'store',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const catalogFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        reference: product.reference || '',
        description: product.description || '',
        price: product.price || 0,
        onlinePrice: product.onlinePrice || 0,
        cost: product.cost || 0,
        stock: {
          warehouse: product.stock?.warehouse || 0,
          store: product.stock?.store || 0,
          total: product.stock?.total || 0,
        },
        categoryId: product.categoryId || '',
        brand: product.brand || '',
        status: product.status || 'active',
        initialLocation: 'store' as 'warehouse' | 'store',
      })
      setCatalogImageUrl(product.imageUrl?.trim() || null)
    } else {
      setCatalogImageUrl(null)
    }
    setUploadPreview(null)
  }, [product])

  const formatNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue) || numValue === 0) return ''

    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  const parseFormattedNumber = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
    return parseFloat(cleanValue) || 0
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'discontinued':
        return 'Descontinuado'
      case 'out_of_stock':
        return 'Sin Stock'
      default:
        return status
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }
    if (!formData.reference.trim()) {
      newErrors.reference = 'La referencia es requerida'
    } else {
      const referenceExists = products.some(
        p =>
          p.reference.toLowerCase() === formData.reference.toLowerCase() && (!product || p.id !== product.id)
      )

      if (referenceExists) {
        newErrors.reference = 'Esta referencia ya existe en otro producto'
      }
    }
    if (formData.price <= 0) {
      newErrors.price = 'El precio de venta debe ser mayor a 0'
    }
    if (formData.cost < 0) {
      newErrors.cost = 'El costo no puede ser negativo'
    }
    if (formData.stock.warehouse < 0) {
      newErrors.stockWarehouse = 'El stock de bodega no puede ser negativo'
    }
    if (formData.stock.store < 0) {
      newErrors.stockStore = 'El stock de local no puede ser negativo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCatalogImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      toast.success('Imagen del catálogo guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value,
        },
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSave = () => {
    if (validateForm()) {
      const totalStock = formData.stock.warehouse + formData.stock.store
      const productData: Omit<Product, 'id'> = {
        name: formData.name.trim(),
        reference: formData.reference.trim(),
        description: formData.description.trim(),
        price: formData.price,
        onlinePrice: formData.onlinePrice,
        cost: formData.cost,
        stock: {
          warehouse: formData.stock.warehouse,
          store: formData.stock.store,
          total: totalStock,
        },
        categoryId: formData.categoryId,
        brand: formData.brand.trim(),
        status: formData.status,
        imageUrl: catalogImageUrl?.trim() || null,
        createdAt: product?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onSave(productData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      reference: '',
      description: '',
      price: 0,
      onlinePrice: 0,
      cost: 0,
      stock: {
        warehouse: 0,
        store: 0,
        total: 0,
      },
      categoryId: '',
      brand: '',
      status: 'active',
      initialLocation: 'store',
    })
    setCatalogImageUrl(null)
    setUploadPreview(null)
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const formId = 'product-modal-form'
  const isEdit = !!product

  const modal = (
    <div className={cn('fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-56', MODAL_BACKDROP_PAD)}>
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950',
          MODAL_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-4 md:px-6 md:py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-3">
            <Package className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2 id="product-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                {isEdit ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {isEdit ? `Editando ${product.name}` : 'Crea un producto en tu inventario'}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-4 md:px-6 md:py-5 dark:bg-zinc-950">
          <form
            id={formId}
            onSubmit={e => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="space-y-4 lg:space-y-5">
                <SectionCard icon={Package} title="Información básica" iconClass="text-emerald-600 dark:text-emerald-400">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="product-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Nombre del producto <span className="text-zinc-400 dark:text-zinc-500">*</span>
                        </label>
                        <input
                          id="product-name"
                          type="text"
                          value={formData.name}
                          onChange={e => handleInputChange('name', e.target.value)}
                          className={cn(inputBase, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder="Nombre del producto"
                        />
                        {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-ref" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Referencia <span className="text-zinc-400 dark:text-zinc-500">*</span>
                        </label>
                        <input
                          id="product-ref"
                          type="text"
                          value={formData.reference}
                          onChange={e => handleInputChange('reference', e.target.value)}
                          className={cn(inputBase, errors.reference && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder="REF-001"
                        />
                        {errors.reference && <p className="mt-1.5 text-sm text-red-400">{errors.reference}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-desc" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Descripción <span className="font-normal text-zinc-500">(opcional)</span>
                      </label>
                      <textarea
                        id="product-desc"
                        value={formData.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        className={cn(inputBase, 'min-h-[5.5rem] resize-none', errors.description && 'border-red-500/70')}
                        placeholder="Descripción detallada del producto"
                        rows={3}
                      />
                      {errors.description && <p className="mt-1.5 text-sm text-red-400">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="product-brand" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Marca <span className="font-normal text-zinc-500">(opcional)</span>
                        </label>
                        <input
                          id="product-brand"
                          type="text"
                          value={formData.brand}
                          onChange={e => handleInputChange('brand', e.target.value)}
                          className={cn(inputBase, errors.brand && 'border-red-500/70')}
                          placeholder="Marca"
                        />
                        {errors.brand && <p className="mt-1.5 text-sm text-red-400">{errors.brand}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-cat" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Categoría <span className="font-normal text-zinc-500">(opcional)</span>
                        </label>
                        <select
                          id="product-cat"
                          value={formData.categoryId}
                          onChange={e => handleInputChange('categoryId', e.target.value)}
                          className={cn(inputBase, errors.categoryId && 'border-red-500/70')}
                        >
                          <option value="">Seleccionar categoría</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {errors.categoryId && <p className="mt-1.5 text-sm text-red-400">{errors.categoryId}</p>}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Oculto a propósito — no eliminar: catálogo web / imagen de producto */}
                <div className="hidden" aria-hidden="true">
                <SectionCard
                  icon={ImageIcon}
                  title="Imagen del catálogo"
                  description="Foto para ficha y listados (máx. 5MB)."
                  iconClass="text-sky-600 dark:text-sky-400"
                >
                  <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60">
                    {uploadPreview || catalogImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={uploadPreview || catalogImageUrl || ''}
                        alt="Vista previa catálogo"
                        className="mx-auto block max-h-56 w-full object-contain"
                      />
                    ) : (
                      <div className="flex min-h-[140px] items-center justify-center px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Sin imagen · sube una foto del producto
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      ref={catalogFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImage}
                      onChange={handleCatalogImageFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => catalogFileInputRef.current?.click()}
                      className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
                    </Button>
                    {catalogImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        disabled={uploadingImage}
                        onClick={() => setCatalogImageUrl(null)}
                      >
                        Quitar imagen
                      </Button>
                    )}
                  </div>
                </SectionCard>
                </div>

                <SectionCard icon={DollarSign} title="Información financiera" iconClass="text-amber-600 dark:text-amber-400">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="product-price" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Precio de venta <span className="text-zinc-400 dark:text-zinc-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-price"
                          type="text"
                          value={formatNumber(formData.price)}
                          onChange={e => handleInputChange('price', parseFormattedNumber(e.target.value))}
                          className={cn(inputBase, 'pl-8', errors.price && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.price && <p className="mt-1.5 text-sm text-red-400">{errors.price}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-cost" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Costo de adquisición
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-cost"
                          type="text"
                          value={formatNumber(formData.cost)}
                          onChange={e => handleInputChange('cost', parseFormattedNumber(e.target.value))}
                          className={cn(inputBase, 'pl-8', errors.cost && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.cost && <p className="mt-1.5 text-sm text-red-400">{errors.cost}</p>}
                    </div>
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-4 lg:space-y-5">
                <SectionCard icon={BarChart3} title="Control de stock" iconClass="text-sky-600 dark:text-sky-400">
                  {product && (
                    <div className="-mt-2 mb-4 flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/60 dark:bg-zinc-900/50">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        El stock se muestra solo como referencia. Para ajustar o transferir, usa la tabla de productos.
                      </p>
                    </div>
                  )}

                  {!product && isMainStore && (
                    <div className="mb-4">
                      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ubicación inicial</span>
                      <div className="flex gap-2 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
                        <button
                          type="button"
                          onClick={() => handleInputChange('initialLocation', 'store')}
                          aria-pressed={formData.initialLocation === 'store'}
                          className={cn(
                            'flex min-h-[2.875rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                            formData.initialLocation === 'store'
                              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 dark:bg-emerald-500 dark:ring-emerald-400/40'
                              : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                          )}
                        >
                          <Store className="h-4 w-4 shrink-0" strokeWidth={2} />
                          Local
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('initialLocation', 'warehouse')}
                          aria-pressed={formData.initialLocation === 'warehouse'}
                          className={cn(
                            'flex min-h-[2.875rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                            formData.initialLocation === 'warehouse'
                              ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-500/35 dark:bg-sky-500 dark:ring-sky-400/40'
                              : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                          )}
                        >
                          <Package className="h-4 w-4 shrink-0" strokeWidth={2} />
                          Bodega
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={cn('grid grid-cols-1 gap-6', isMainStore && 'md:grid-cols-2')}>
                    <div
                      className={cn(
                        'space-y-3 rounded-xl border p-3 transition-colors',
                        !product && isMainStore && formData.initialLocation === 'store'
                          ? 'border-emerald-500/40 bg-emerald-500/[0.06] dark:border-emerald-400/35 dark:bg-emerald-500/10'
                          : 'border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <Store
                          className={cn(
                            'h-4 w-4',
                            !product && isMainStore && formData.initialLocation === 'store'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-400 dark:text-zinc-500'
                          )}
                          strokeWidth={1.75}
                        />
                        <h4 className="text-sm font-semibold">Local</h4>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stock actual</label>
                        {product ? (
                            <div className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                            {formatNumber(formData.stock.store)} unidades
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={formatNumber(formData.stock.store)}
                            onChange={e => handleInputChange('stock.store', parseFormattedNumber(e.target.value))}
                            className={cn(inputBase, errors.stockStore && 'border-red-500/70')}
                            placeholder="0"
                          />
                        )}
                        {errors.stockStore && <p className="mt-1.5 text-sm text-red-400">{errors.stockStore}</p>}
                      </div>
                    </div>

                    {isMainStore && (
                      <div
                        className={cn(
                          'space-y-3 rounded-xl border p-3 transition-colors',
                          !product && formData.initialLocation === 'warehouse'
                            ? 'border-sky-500/40 bg-sky-500/[0.06] dark:border-sky-400/35 dark:bg-sky-500/10'
                            : 'border-transparent'
                        )}
                      >
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <Package
                          className={cn(
                            'h-4 w-4',
                            !product && formData.initialLocation === 'warehouse'
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-zinc-400 dark:text-zinc-500'
                          )}
                          strokeWidth={1.75}
                        />
                          <h4 className="text-sm font-semibold">Bodega</h4>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stock actual</label>
                          {product ? (
                            <div className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                              {formatNumber(formData.stock.warehouse)} unidades
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={formatNumber(formData.stock.warehouse)}
                              onChange={e => handleInputChange('stock.warehouse', parseFormattedNumber(e.target.value))}
                              className={cn(inputBase, errors.stockWarehouse && 'border-red-500/70')}
                              placeholder="0"
                            />
                          )}
                          {errors.stockWarehouse && (
                            <p className="mt-1.5 text-sm text-red-400">{errors.stockWarehouse}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700/60 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Stock total</span>
                      <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatNumber(
                          isMainStore ? formData.stock.warehouse + formData.stock.store : formData.stock.store
                        )}{' '}
                        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-500">unidades</span>
                      </span>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={AlertTriangle} title="Estado del producto" iconClass="text-amber-500 dark:text-amber-400">
                  <div className="flex flex-wrap gap-2">
                    {(['active', 'inactive', 'discontinued', 'out_of_stock'] as const).map(status => {
                      const selected = formData.status === status
                      const selectedClass =
                        status === 'active'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/25 dark:border-emerald-500 dark:bg-emerald-500'
                          : status === 'inactive'
                            ? 'border-zinc-700 bg-zinc-700 text-white shadow-md ring-2 ring-zinc-500/30 dark:border-zinc-500 dark:bg-zinc-600'
                            : status === 'discontinued'
                              ? 'border-sky-600 bg-sky-600 text-white shadow-md ring-2 ring-sky-500/30 dark:border-sky-500 dark:bg-sky-500'
                              : 'border-red-600 bg-red-600 text-white shadow-md ring-2 ring-red-500/30 dark:border-red-500 dark:bg-red-500'
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleInputChange('status', status)}
                          aria-pressed={selected}
                          className={cn(
                            'rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all',
                            selected
                              ? selectedClass
                              : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200'
                          )}
                        >
                          {getStatusLabel(status)}
                        </button>
                      )
                    })}
                  </div>
                </SectionCard>
              </div>
            </div>
          </form>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-zinc-200 bg-white px-4 py-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-950"
          style={{ paddingBottom: `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))` }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-transparent px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-500/80 dark:text-white dark:hover:bg-zinc-800/80"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:border-emerald-400 dark:hover:bg-emerald-400"
          >
            <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
