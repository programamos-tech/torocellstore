'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Ruta legacy: redirige a la lista de productos (sin ficha de detalle). */
export default function ProductDetailRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/inventory/products')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600" />
    </div>
  )
}
