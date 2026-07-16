'use client'

import { useCallback, useEffect, useState } from 'react'
import { readSalesPosMode, writeSalesPosMode } from '@/lib/sales-pos-preference'

export function useSalesPosPreference() {
  const [posMode, setPosModeState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setPosModeState(readSalesPosMode())
    sync()
    setReady(true)
    window.addEventListener('zonat-sales-pos-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('zonat-sales-pos-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setPosMode = useCallback((enabled: boolean) => {
    setPosModeState(enabled)
    writeSalesPosMode(enabled)
  }, [])

  const togglePosMode = useCallback(() => {
    setPosModeState((prev) => {
      const next = !prev
      writeSalesPosMode(next)
      return next
    })
  }, [])

  return { posMode, setPosMode, togglePosMode, ready }
}
