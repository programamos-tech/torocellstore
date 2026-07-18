'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, showText = false, size = 'md' }: LogoProps) {
  const logoSize = {
    sm: 32,
    md: 48,
    lg: 64,
  }[size]

  return (
    <div className={cn('flex items-center', className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-black"
        style={{ width: logoSize, height: logoSize }}
      >
        <Image
          src="/logo.jpeg?v=2"
          alt="TOROCELL STORE Logo"
          fill
          sizes={`${logoSize}px`}
          className="rounded-full object-cover"
          priority
          unoptimized
        />
      </div>
      {showText && (
        <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
          TOROCELL STORE
        </span>
      )}
    </div>
  )
}
