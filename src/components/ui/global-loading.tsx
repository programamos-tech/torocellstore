'use client'

import { Logo } from './logo'
import { useRouterEvents } from '@/hooks/use-router-events'

export function GlobalLoading() {
  const isLoading = useRouterEvents()

  if (!isLoading) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex scale-150 items-center justify-center overflow-hidden rounded-full">
        <div className="animate-pulse">
          <Logo size="lg" showText={false} />
        </div>
      </div>
    </div>
  )
}
