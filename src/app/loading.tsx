'use client'

import { Logo } from '@/components/ui/logo'

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex scale-150 items-center justify-center overflow-hidden rounded-full">
        <div className="animate-pulse">
          <Logo size="lg" showText={false} />
        </div>
      </div>
    </div>
  )
}
