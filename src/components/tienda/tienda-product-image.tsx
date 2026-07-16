'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type TiendaProductImageProps = {
  src: string
  alt: string
  className?: string
  sizes?: string
  fill?: boolean
  priority?: boolean
}

/** Imagen de producto en /tienda — unoptimized evita fallos del optimizador con Storage en prod. */
export function TiendaProductImage({
  src,
  alt,
  className,
  sizes,
  fill = true,
  priority
}: TiendaProductImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      unoptimized
      priority={priority}
      className={cn(className)}
      sizes={sizes}
    />
  )
}
