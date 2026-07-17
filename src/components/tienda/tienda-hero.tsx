'use client'

import { useState } from 'react'
import { TIENDA_HERO_IMAGE } from '@/config/tienda-storefront'

type TiendaHeroProps = {
  storeName?: string | null
  storeCity?: string | null
}

export function TiendaHero({ storeName, storeCity }: TiendaHeroProps) {
  const [imgError, setImgError] = useState(false)

  const alt = storeName
    ? `Bienvenido a ${storeName}${storeCity ? `, ${storeCity}` : ''}`
    : 'Bienvenido a TOROCELL STORE — tu tienda de confianza en tecnología'

  return (
    <section className="relative w-full bg-[#000000]">
      {!imgError ? (
        <div className="relative w-full">
          <img
            src={TIENDA_HERO_IMAGE}
            alt={alt}
            width={1536}
            height={1024}
            className="block h-auto w-full max-w-full"
            fetchPriority="high"
            decoding="async"
            onError={() => setImgError(true)}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-b from-transparent to-[#000000] sm:h-28"
            aria-hidden
          />
        </div>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[320px]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9DC2D1]">
            Más que tecnología
          </p>
          <h1 className="tienda-display mt-3 text-3xl font-semibold text-[#E8F2F5] sm:text-4xl">
            Bienvenido a TOROCELL STORE
          </h1>
          {storeCity && <p className="mt-2 text-sm text-[#9DC2D1]">{storeCity}</p>}
        </div>
      )}
    </section>
  )
}
