'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Bell,
  CheckCircle2,
  Truck,
  CreditCard,
  FileText,
  Package,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { isMainStoreUser } from '@/lib/store-helper'
import {
  fetchAppNotifications,
  type AppNotification,
  type AppNotificationKind,
} from '@/lib/app-notifications-service'
import {
  filterNotificationsForDisplay,
  getUnreadNotificationBadgeCount,
  isNotificationUnread,
  markNotificationKindSeen,
  markNotificationsSeen,
} from '@/lib/app-notifications-seen'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<
  AppNotificationKind,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  receptions_pending: Truck,
  products_out_of_stock: Package,
  credits_overdue: CreditCard,
  supplier_invoices_overdue: FileText,
}

const KIND_STYLE: Record<AppNotificationKind, { wrap: string; icon: string }> = {
  receptions_pending: {
    wrap: 'bg-orange-100 dark:bg-orange-950/70',
    icon: 'text-orange-700 dark:text-orange-400',
  },
  products_out_of_stock: {
    wrap: 'bg-emerald-100 dark:bg-emerald-950/70',
    icon: 'text-emerald-700 dark:text-emerald-400',
  },
  credits_overdue: {
    wrap: 'bg-rose-100 dark:bg-rose-950/70',
    icon: 'text-rose-700 dark:text-rose-400',
  },
  supplier_invoices_overdue: {
    wrap: 'bg-amber-100 dark:bg-amber-950/70',
    icon: 'text-amber-800 dark:text-amber-400',
  },
}

const PATH_TO_KIND: { prefix: string; kind: AppNotificationKind }[] = [
  { prefix: '/inventory/receptions', kind: 'receptions_pending' },
  { prefix: '/inventory/products', kind: 'products_out_of_stock' },
  { prefix: '/payments', kind: 'credits_overdue' },
  { prefix: '/purchases/invoices', kind: 'supplier_invoices_overdue' },
]

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [ref, onClose, active])
}

export function AppNotificationsBell({ iconBtnClass }: { iconBtnClass: string }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { canView } = usePermissions()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const rawNotificationsRef = useRef<AppNotification[]>([])

  const canViewReceptions = canView('receptions')
  const canViewProducts = canView('products')
  const canViewPayments = canView('payments')
  const canViewSupplierInvoices = canView('supplier_invoices')
  const showBell =
    canViewReceptions || canViewProducts || canViewPayments || canViewSupplierInvoices

  const userId = user?.id
  const storeId = user?.storeId ?? null

  const applyDisplayFilter = useCallback(
    (list: AppNotification[]) => {
      if (!userId) return []
      return filterNotificationsForDisplay(userId, storeId, list)
    },
    [userId, storeId]
  )

  const refreshDisplayed = useCallback(() => {
    setNotifications(applyDisplayFilter(rawNotificationsRef.current))
  }, [applyDisplayFilter])

  const acknowledge = useCallback(
    (items: AppNotification[]) => {
      if (!userId || items.length === 0) return
      markNotificationsSeen(userId, storeId, items)
      refreshDisplayed()
    },
    [userId, storeId, refreshDisplayed]
  )

  const closePanel = useCallback(() => {
    if (open && notifications.length > 0) {
      acknowledge(notifications)
    }
    setOpen(false)
  }, [open, notifications, acknowledge])

  useClickOutside(ref, closePanel, open)

  const load = useCallback(async () => {
    if (!userId || !showBell || !user) {
      setNotifications([])
      rawNotificationsRef.current = []
      return
    }
    setLoading(true)
    try {
      const list = await fetchAppNotifications({
        canViewReceptions,
        canViewProducts,
        canViewPayments,
        canViewSupplierInvoices,
        storeId,
        isMainStore: isMainStoreUser(user),
      })
      rawNotificationsRef.current = list

      const routeMatch = PATH_TO_KIND.find((p) => pathname?.startsWith(p.prefix))
      if (routeMatch) {
        const onPage = list.find((n) => n.kind === routeMatch.kind)
        if (onPage) {
          markNotificationKindSeen(userId, storeId, onPage.kind, onPage.count)
        }
      }

      setNotifications(applyDisplayFilter(list))
    } catch {
      setNotifications([])
      rawNotificationsRef.current = []
    } finally {
      setLoading(false)
    }
  }, [
    userId,
    storeId,
    user,
    pathname,
    showBell,
    canViewReceptions,
    canViewProducts,
    canViewPayments,
    canViewSupplierInvoices,
    applyDisplayFilter,
  ])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), 30000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const handleNotificationClick = (n: AppNotification) => {
    acknowledge([n])
    setOpen(false)
  }

  const toggleOpen = () => {
    if (open) {
      closePanel()
    } else {
      setOpen(true)
    }
  }

  if (!showBell) return null

  const badgeTotal = userId
    ? getUnreadNotificationBadgeCount(userId, storeId, notifications)
    : 0

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          iconBtnClass,
          'relative',
          open && 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        )}
        title={badgeTotal > 0 ? `${badgeTotal} avisos nuevos` : 'Notificaciones'}
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} />
        {badgeTotal > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-neutral-950">
            {badgeTotal > 99 ? '99+' : badgeTotal}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notificaciones</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Se mantienen listadas 24 h después de revisarlas
            </p>
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              Cargando…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <CheckCircle2
                className="h-8 w-8 text-emerald-500 dark:text-emerald-400"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Todo al día</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No hay avisos nuevos. Si surge algo más, te avisamos aquí.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind]
                const style = KIND_STYLE[n.kind]
                const isUnread = userId ? isNotificationUnread(userId, storeId, n) : true
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      role="menuitem"
                      className={cn(
                        'flex gap-3 px-3 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900',
                        !isUnread && 'opacity-80'
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          style.wrap
                        )}
                      >
                        <Icon className={cn('h-4 w-4', style.icon)} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {n.title}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                              isUnread
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            )}
                          >
                            {n.count}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                          {n.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
