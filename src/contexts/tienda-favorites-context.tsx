'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

const STORAGE_KEY = 'torocell_tienda_favorites'

type TiendaFavoritesContextValue = {
  ids: Set<string>
  count: number
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
}

const TiendaFavoritesContext = createContext<TiendaFavoritesContextValue | null>(null)

function readStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id.trim()) : []
  } catch {
    return []
  }
}

export function TiendaFavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIds(new Set(readStorage()))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
    } catch {
      /* ignore */
    }
  }, [ids, hydrated])

  const toggleFavorite = useCallback((productId: string) => {
    const pid = productId.trim()
    if (!pid) return
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }, [])

  const isFavorite = useCallback((productId: string) => ids.has(productId), [ids])

  const value = useMemo(
    () => ({
      ids,
      count: ids.size,
      isFavorite,
      toggleFavorite
    }),
    [ids, isFavorite, toggleFavorite]
  )

  return <TiendaFavoritesContext.Provider value={value}>{children}</TiendaFavoritesContext.Provider>
}

export function useTiendaFavorites() {
  const ctx = useContext(TiendaFavoritesContext)
  if (!ctx) {
    throw new Error('useTiendaFavorites must be used within TiendaFavoritesProvider')
  }
  return ctx
}
