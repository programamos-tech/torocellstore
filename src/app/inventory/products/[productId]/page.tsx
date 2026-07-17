'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * La ficha de producto (/inventory/products/[id]) quedó deshabilitada.
 * Redirige a la lista; la edición se hace con el modal desde la tabla.
 */
export default function ProductDetailPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/inventory/products')
  }, [router])

  return (
    <div className="flex h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600 dark:border-zinc-600 dark:border-t-emerald-400" />
    </div>
  )
}
