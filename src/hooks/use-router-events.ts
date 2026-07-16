'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function useRouterEvents() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    setIsLoading(true)
    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [pathname])

  return isLoading
}
