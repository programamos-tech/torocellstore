'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Package, Truck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { isMainStoreUser } from '@/lib/store-helper'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import type { StoreStockTransfer } from '@/types'
import { cn } from '@/lib/utils'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
const STORAGE_PREFIX = 'torocell_seen_incoming_transfers:'
const POLL_MS = 20000

function storageKey(storeId: string) {
  return `${STORAGE_PREFIX}${storeId}`
}

function readSeenIds(storeId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(storeId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeSeenIds(storeId: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey(storeId), JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

function formatTransferLabel(transfer: StoreStockTransfer) {
  return transfer.transferNumber || `#${transfer.id.slice(-8).toUpperCase()}`
}

export function IncomingTransferModal() {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()

  const [pending, setPending] = useState<StoreStockTransfer[]>([])
  const [open, setOpen] = useState(false)

  const storeId = useMemo(() => {
    if (!user) return null
    return isMainStoreUser(user) ? MAIN_STORE_ID : user.storeId || null
  }, [user])

  const canShow =
    Boolean(user && storeId && canView('receptions')) &&
    pathname !== '/login' &&
    pathname !== '/select-store' &&
    !pathname.startsWith('/tienda') &&
    !pathname.startsWith('/inventory/receptions')

  const checkIncoming = useCallback(async () => {
    if (!canShow || !storeId) {
      setOpen(false)
      setPending([])
      return
    }

    try {
      const result = await StoreStockTransferService.getPendingTransfers(storeId, 1, 10)
      // Solo traslados destinados a esta tienda (también si es principal)
      const destinedHere = (result.transfers || []).filter((t) => t.toStoreId === storeId)
      const seen = readSeenIds(storeId)
      const unseen = destinedHere.filter((t) => !seen.has(t.id))

      setPending(unseen)
      setOpen(unseen.length > 0)
    } catch {
      /* silencioso */
    }
  }, [canShow, storeId])

  useEffect(() => {
    if (!canShow) return

    void checkIncoming()
    const interval = setInterval(() => void checkIncoming(), POLL_MS)

    const onFocus = () => void checkIncoming()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [canShow, checkIncoming])

  const markSeen = useCallback(() => {
    if (!storeId || pending.length === 0) return
    const seen = readSeenIds(storeId)
    pending.forEach((t) => seen.add(t.id))
    writeSeenIds(storeId, seen)
  }, [storeId, pending])

  const handleDismiss = () => {
    markSeen()
    setOpen(false)
    setPending([])
  }

  const handleGoReceive = () => {
    markSeen()
    setOpen(false)
    setPending([])
    router.push('/inventory/receptions')
  }

  if (!canShow) return null

  const primary = pending[0]
  const extraCount = Math.max(0, pending.length - 1)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss()
      }}
    >
      <DialogContent
        className={cn(
          'max-w-md gap-0 overflow-hidden border-orange-200/90 p-0 dark:border-orange-800/60',
          'bg-white dark:bg-zinc-950'
        )}
      >
        <DialogHeader className="space-y-0 border-b border-orange-100 bg-orange-50/80 px-6 py-5 text-left dark:border-orange-900/40 dark:bg-orange-950/30">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
              <Truck className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Nuevo traslado por recibir
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                Llegó mercancía desde otra tienda. Revísalo y confírmalo en Recepciones.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {primary && (
          <div className="space-y-3 px-6 py-5">
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
                Traslado
              </div>
              <p className="mt-1.5 font-mono text-base font-semibold text-orange-700 dark:text-orange-300">
                {formatTransferLabel(primary)}
              </p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Desde</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {primary.fromStoreName || 'Tienda origen'}
                  </dd>
                </div>
                {primary.items && primary.items.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">Productos</dt>
                    <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {primary.items.length} línea{primary.items.length === 1 ? '' : 's'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {extraCount > 0 && (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                +{extraCount} traslado{extraCount === 1 ? '' : 's'} más pendiente
                {extraCount === 1 ? '' : 's'} de recibir
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 border-t border-zinc-200/80 bg-zinc-50/50 px-6 py-4 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900/30">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleDismiss}
          >
            Más tarde
          </Button>
          <Button
            type="button"
            className="w-full border-orange-600 bg-orange-600 text-white hover:border-orange-500 hover:bg-orange-500 dark:border-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400 sm:w-auto"
            onClick={handleGoReceive}
          >
            Ir a recibir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
