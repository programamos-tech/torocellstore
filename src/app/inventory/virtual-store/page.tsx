'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Search, Package, Pencil, Globe, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { VirtualStoreProductModal } from '@/components/virtual-store/virtual-store-product-modal'
import { useProducts } from '@/contexts/products-context'
import type { Product } from '@/types'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function VirtualStorePage() {
  const { products, loading, refreshProducts, searchProducts } = useProducts()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[] | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    void refreshProducts()
  }, [refreshProducts])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null)
      return
    }
    const timeout = setTimeout(async () => {
      const results = await searchProducts(searchTerm.trim())
      setSearchResults(results)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchTerm, searchProducts])

  const list = useMemo(() => {
    const source = searchResults ?? products
    return [...source].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [products, searchResults])

  const publishedCount = useMemo(
    () => list.filter((p) => (p.onlinePrice || 0) > 0).length,
    [list]
  )

  const openEditor = (product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  return (
    <RoleProtectedRoute module="virtual_store" requiredAction="view">
      <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Globe className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Catálogo web</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tienda virtual</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Sube la imagen y define el precio público de cada producto para /tienda. El precio por mayor no se publica en la web.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-zinc-300 bg-white px-3 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900">
            {publishedCount} con precio web · {list.length} productos
          </Badge>
        </div>

        <div className={cn(cardShell, 'p-4')}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o referencia…"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm text-zinc-500">Cargando productos…</div>
        ) : list.length === 0 ? (
          <div className={cn(cardShell, 'flex min-h-[240px] flex-col items-center justify-center p-8 text-center')}>
            <Package className="mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-sm text-zinc-500">No hay productos para mostrar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((product) => {
              const hasOnlinePrice = (product.onlinePrice || 0) > 0
              const hasImage = Boolean(product.imageUrl)
              return (
                <article
                  key={product.id}
                  className={cn(
                    cardShell,
                    'flex flex-col overflow-hidden transition-shadow hover:shadow-md'
                  )}
                >
                  <div className="relative aspect-[4/3] bg-zinc-50 dark:bg-zinc-900/50">
                    {hasImage ? (
                      <Image
                        src={product.imageUrl!}
                        alt={product.name}
                        fill
                        className="object-contain p-3"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-300">
                        <ImageIcon className="h-12 w-12" strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'border bg-white/95 text-[10px] font-semibold backdrop-blur-sm dark:bg-zinc-900/90',
                          hasOnlinePrice
                            ? 'border-emerald-300 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300'
                            : 'border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300'
                        )}
                      >
                        {hasOnlinePrice ? 'En catálogo web' : 'Sin precio web'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-mono text-[11px] font-semibold text-zinc-500">{product.reference}</p>
                    <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {product.name}
                    </h2>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500">Precio web</span>
                        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {hasOnlinePrice ? formatCOP(product.onlinePrice || 0) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-400">Por mayor</span>
                        <span className="tabular-nums text-zinc-500">{formatCOP(product.price)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-400">Stock</span>
                        <span className="tabular-nums text-zinc-500">{product.stock.total}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => openEditor(product)}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Editar catálogo web
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <VirtualStoreProductModal
          isOpen={modalOpen}
          product={selectedProduct}
          onClose={() => {
            setModalOpen(false)
            setSelectedProduct(null)
          }}
          onSaved={() => void refreshProducts()}
        />
      </div>
    </RoleProtectedRoute>
  )
}
