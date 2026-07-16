'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  CircleHelp,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  UserCircle,
  Receipt,
  Users,
  Package,
  FileText,
  Truck,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { TopBarThemeToggle } from '@/components/layout/top-bar-theme-toggle'
import { AppTopBarSearch } from '@/components/layout/app-top-bar-search'
import { AppNotificationsBell } from '@/components/layout/app-notifications-bell'
import { cn } from '@/lib/utils'

function roleLabel(role?: string) {
  switch (role) {
    case 'superadmin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'vendedor':
      return 'Vendedor'
    case 'inventario':
      return 'Inventario'
    case 'contador':
      return 'Contador'
    default:
      return 'Usuario'
  }
}

type QuickAction = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [ref, onClose, active])
}

export function AppTopBar({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { canCreate, canView } = usePermissions()
  const [plusOpen, setPlusOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useClickOutside(plusRef, () => setPlusOpen(false), plusOpen)
  useClickOutside(userRef, () => setUserOpen(false), userOpen)

  const quickActions: QuickAction[] = []
  if (canCreate('sales')) {
    quickActions.push({ label: 'Nueva venta', href: '/sales/new', icon: Receipt })
  }
  if (canCreate('clients')) {
    quickActions.push({ label: 'Nuevo cliente', href: '/clients', icon: Users })
  }
  if (canCreate('products')) {
    quickActions.push({ label: 'Nuevo producto', href: '/inventory/products', icon: Package })
  }
  if (canCreate('supplier_invoices')) {
    quickActions.push({ label: 'Factura proveedor', href: '/purchases/invoices', icon: FileText })
  }
  if (canCreate('transfers')) {
    quickActions.push({ label: 'Traslado', href: '/inventory/transfers', icon: Truck })
  }

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

  return (
    <header
      className={cn(
        'relative z-30 w-full min-w-0 border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="flex w-full min-w-0 min-h-[3.25rem] items-center gap-2 px-[13px] py-2 md:gap-3 md:px-[25px] md:py-2.5 xl:px-[33px] 2xl:px-[41px]">
        <AppTopBarSearch className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {/* Crear rápido */}
        {quickActions.length > 0 && (
          <div ref={plusRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPlusOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800/90 bg-[#0b0d12] text-zinc-100 shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
              aria-label="Crear nuevo"
              aria-expanded={plusOpen}
            >
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            {plusOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[12.5rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.href + action.label}
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900"
                      onClick={() => {
                        setPlusOpen(false)
                        router.push(action.href)
                      }}
                    >
                      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div
          className="hidden h-8 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 md:block"
          aria-hidden
        />

        {/* Utilidades — ocultas en móvil muy estrecho; tema siempre en sidebar móvil */}
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          <TopBarThemeToggle />
          <Link
            href="/profile"
            className={iconBtn}
            title="Ayuda y perfil"
            aria-label="Ayuda y perfil"
          >
            <CircleHelp className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
          </Link>
          {canView('logs') && (
            <Link
              href="/logs"
              className={cn(iconBtn, pathname === '/logs' && 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100')}
              title="Actividades"
              aria-label="Actividades"
            >
              <Activity className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
            </Link>
          )}
          <Link
            href="/profile"
            className={cn(iconBtn, pathname === '/profile' && 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100')}
            title="Ajustes"
            aria-label="Ajustes"
          >
            <SlidersHorizontal className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
          </Link>
          <AppNotificationsBell iconBtnClass={iconBtn} />
        </div>

        {/* Usuario */}
        <div ref={userRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
            aria-expanded={userOpen}
            aria-haspopup="menu"
          >
            <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100 md:inline">
              {user?.name || 'Usuario'}
            </span>
            <UserAvatar
              name={user?.name || 'Usuario'}
              seed={user?.id}
              size="sm"
              className="ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-zinc-400 transition-transform md:block',
                userOpen && 'rotate-180'
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
          {userOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-[60] w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {user?.name || 'Usuario'}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {roleLabel(user?.role)}
                </p>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => setUserOpen(false)}
              >
                <UserCircle className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                Mi perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => {
                  setUserOpen(false)
                  logout()
                }}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
