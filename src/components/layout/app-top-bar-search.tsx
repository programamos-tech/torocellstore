'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  User,
  Package,
  Receipt,
  CreditCard,
  FileText,
  Truck,
  ShieldCheck,
  Building2,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import {
  runGlobalSearch,
  type GlobalSearchSection,
  type GlobalSearchHit,
  type GlobalSearchKind,
  type GlobalSearchModule,
} from '@/lib/global-search-service'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<
  GlobalSearchKind,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  client: User,
  product: Package,
  sale: Receipt,
  credit: CreditCard,
  supplier_invoice: FileText,
  supplier: Building2,
  transfer: Truck,
  warranty: ShieldCheck,
}

const KIND_LABEL: Record<GlobalSearchKind, string> = {
  client: 'Cliente',
  product: 'Producto',
  sale: 'Venta',
  credit: 'Crédito',
  supplier_invoice: 'Factura',
  supplier: 'Proveedor',
  transfer: 'Traslado',
  warranty: 'Garantía',
}

/** Acentos suaves por tipo (icono, badge, encabezado de sección). */
const KIND_STYLE: Record<
  GlobalSearchKind,
  {
    iconWrap: string
    icon: string
    badge: string
    section: string
    dot: string
    hover: string
  }
> = {
  client: {
    iconWrap: 'bg-sky-100 dark:bg-sky-950/70',
    icon: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    section: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    hover: 'hover:bg-sky-50/80 dark:hover:bg-sky-950/30',
  },
  product: {
    iconWrap: 'bg-emerald-100 dark:bg-emerald-950/70',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    section: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    hover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
  },
  sale: {
    iconWrap: 'bg-violet-100 dark:bg-violet-950/70',
    icon: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    section: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    hover: 'hover:bg-violet-50/80 dark:hover:bg-violet-950/30',
  },
  credit: {
    iconWrap: 'bg-amber-100 dark:bg-amber-950/70',
    icon: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    section: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    hover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
  },
  supplier_invoice: {
    iconWrap: 'bg-rose-100 dark:bg-rose-950/70',
    icon: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    section: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-600',
    hover: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
  },
  supplier: {
    iconWrap: 'bg-orange-100 dark:bg-orange-950/70',
    icon: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    section: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
    hover: 'hover:bg-orange-50/80 dark:hover:bg-orange-950/30',
  },
  transfer: {
    iconWrap: 'bg-orange-100 dark:bg-orange-950/70',
    icon: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    section: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
    hover: 'hover:bg-orange-50/80 dark:hover:bg-orange-950/30',
  },
  warranty: {
    iconWrap: 'bg-indigo-100 dark:bg-indigo-950/70',
    icon: 'text-indigo-700 dark:text-indigo-400',
    badge: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
    section: 'text-indigo-700 dark:text-indigo-400',
    dot: 'bg-indigo-500',
    hover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30',
  },
}

export function AppTopBarSearch({ className }: { className?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { canView } = usePermissions()
  const [query, setQuery] = useState('')
  const [sections, setSections] = useState<GlobalSearchSection[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const q = query.trim()
  const totalHits = sections.reduce((n, s) => n + s.hits.length, 0)

  // canView cambia de referencia en cada render; serializar permisos evita re-ejecutar el efecto en bucle.
  const permissionsKey = user?.permissions ? JSON.stringify(user.permissions) : ''

  const enabledModules = useMemo((): GlobalSearchModule[] => {
    const mods: GlobalSearchModule[] = []
    if (canView('clients')) mods.push('clients')
    if (canView('products')) mods.push('products')
    if (canView('sales')) mods.push('sales')
    if (canView('payments')) mods.push('payments')
    if (canView('supplier_invoices')) mods.push('supplier_invoices')
    if (canView('transfers')) mods.push('transfers')
    if (canView('warranties')) mods.push('warranties')
    return mods
  }, [user?.id, user?.role, permissionsKey])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (q.length < 2) {
      searchGenRef.current += 1
      setSections([])
      setLoading(false)
      setOpen(false)
      return
    }

    if (enabledModules.length === 0) {
      setSections([])
      setLoading(false)
      setOpen(false)
      return
    }

    setOpen(true)

    debounceRef.current = setTimeout(() => {
      const gen = ++searchGenRef.current
      void (async () => {
        setLoading(true)
        try {
          const result = await runGlobalSearch(q, {
            storeId: user?.storeId,
            enabledModules,
          })
          if (gen === searchGenRef.current) {
            setSections(result)
          }
        } catch {
          if (gen === searchGenRef.current) {
            setSections([])
          }
        } finally {
          if (gen === searchGenRef.current) {
            setLoading(false)
          }
        }
      })()
    }, 320)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      searchGenRef.current += 1
    }
  }, [q, user?.storeId, enabledModules])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const go = useCallback(
    (href: string) => {
      searchGenRef.current += 1
      setOpen(false)
      setQuery('')
      setSections([])
      setLoading(false)
      router.push(href)
    },
    [router]
  )

  const clear = () => {
    searchGenRef.current += 1
    setQuery('')
    setSections([])
    setLoading(false)
    setOpen(false)
  }

  const showPanel = open && q.length >= 2
  const showEmpty = showPanel && !loading && totalHits === 0

  const renderHit = (hit: GlobalSearchHit) => {
    const Icon = KIND_ICON[hit.kind]
    const style = KIND_STYLE[hit.kind]
    return (
      <button
        key={hit.id}
        type="button"
        role="option"
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
          style.hover,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-300/60 dark:focus-visible:ring-zinc-600/50'
        )}
        onClick={() => go(hit.href)}
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            style.iconWrap
          )}
        >
          <Icon className={cn('h-4 w-4', style.icon)} strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{hit.label}</div>
          {hit.sublabel && (
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{hit.sublabel}</div>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            style.badge
          )}
        >
          {KIND_LABEL[hit.kind]}
        </span>
      </button>
    )
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0 flex-1', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          strokeWidth={1.5}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Clientes, facturas, productos, código…"
          className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50/80 py-2 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300/40 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:bg-zinc-950 dark:focus:ring-zinc-600/30"
          autoComplete="off"
          aria-label="Búsqueda global"
          aria-expanded={showPanel}
          aria-controls="topbar-search-results"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="topbar-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-emerald-700 dark:text-emerald-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              Buscando…
            </div>
          )}

          {!loading &&
            sections.map((section, idx) => {
              const sectionStyle = KIND_STYLE[section.kind]
              return (
              <div key={section.kind}>
                {idx > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800" />}
                <p
                  className={cn(
                    'flex items-center gap-1.5 px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider',
                    sectionStyle.section
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', sectionStyle.dot)} aria-hidden />
                  {section.title}
                </p>
                {section.hits.map(renderHit)}
              </div>
            )})}

          {showEmpty && (
            <div className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Sin resultados para &quot;{q}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
