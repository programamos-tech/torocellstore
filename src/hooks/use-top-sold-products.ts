'use client'

import { useEffect, useState } from 'react'
import type { Product } from '@/types'
import { SalesService } from '@/lib/sales-service'
import { ProductsService } from '@/lib/products-service'

export function useTopSoldProducts(enabled = true) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setProducts([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    SalesService.getTopSoldProductIds()
      .then(async (ranked) => {
        const ids = ranked.map((r) => r.productId)
        const fetched = await ProductsService.getFullProductsByIds(ids)
        if (cancelled) return

        const withStock = fetched.filter((p) => {
          if (p.status !== 'active') return false
          return (p.stock.store || 0) + (p.stock.warehouse || 0) > 0
        })

        setProducts(withStock)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { products, loading }
}
