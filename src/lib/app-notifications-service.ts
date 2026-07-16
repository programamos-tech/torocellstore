import { supabase } from './supabase'
import { ProductsService } from './products-service'
import { StoreStockTransferService } from './store-stock-transfer-service'
import { getCurrentUserStoreId } from './store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type AppNotificationKind =
  | 'receptions_pending'
  | 'products_out_of_stock'
  | 'credits_overdue'
  | 'supplier_invoices_overdue'

export type AppNotification = {
  id: AppNotificationKind
  kind: AppNotificationKind
  title: string
  description: string
  count: number
  href: string
}

function todayDateStringLocal(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStoreFilter(query: any, storeId: string | null) {
  if (!storeId || storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return query.eq('store_id', storeId)
}

async function countOverdueCredits(): Promise<number> {
  const storeId = getCurrentUserStoreId()
  const today = todayDateStringLocal()

  let query = supabase
    .from('credits')
    .select('*', { count: 'exact', head: true })
    .gt('pending_amount', 0)
    .in('status', ['pending', 'partial', 'overdue'])
    .or(`status.eq.overdue,and(due_date.lt.${today},due_date.not.is.null)`)

  query = applyStoreFilter(query, storeId)

  const { count, error } = await query
  if (error) return 0
  return count ?? 0
}

async function countOverdueSupplierInvoices(): Promise<number> {
  const storeId = getCurrentUserStoreId()
  const today = todayDateStringLocal()

  let query = supabase
    .from('supplier_invoices')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'partial'])
    .lt('due_date', today)
    .not('due_date', 'is', null)

  query = applyStoreFilter(query, storeId)

  const { count, error } = await query
  if (error) return 0
  return count ?? 0
}

async function countPendingReceptions(storeId: string): Promise<number> {
  try {
    const result = await StoreStockTransferService.getPendingTransfers(storeId, 1, 1)
    return result.total || 0
  } catch {
    return 0
  }
}

export type FetchAppNotificationsOptions = {
  canViewReceptions: boolean
  canViewProducts: boolean
  canViewPayments: boolean
  canViewSupplierInvoices: boolean
  storeId: string | null
  isMainStore: boolean
}

export async function fetchAppNotifications(
  options: FetchAppNotificationsOptions
): Promise<AppNotification[]> {
  const { canViewReceptions, canViewProducts, canViewPayments, canViewSupplierInvoices, storeId, isMainStore } =
    options

  const effectiveStoreId = isMainStore ? MAIN_STORE_ID : storeId
  const out: AppNotification[] = []

  const tasks: Promise<void>[] = []

  if (canViewReceptions && effectiveStoreId) {
    tasks.push(
      countPendingReceptions(effectiveStoreId).then((count) => {
        if (count > 0) {
          out.push({
            id: 'receptions_pending',
            kind: 'receptions_pending',
            title: 'Recepciones pendientes',
            description:
              count === 1
                ? '1 traslado por recibir'
                : `${count} traslados por recibir`,
            count,
            href: '/inventory/receptions',
          })
        }
      })
    )
  }

  if (canViewProducts) {
    tasks.push(
      ProductsService.countOutOfStockProducts(storeId).then((count) => {
        if (count > 0) {
          out.push({
            id: 'products_out_of_stock',
            kind: 'products_out_of_stock',
            title: 'Productos sin stock',
            description:
              count === 1
                ? '1 producto agotado en tu tienda'
                : `${count} productos agotados en tu tienda`,
            count,
            href: '/inventory/products?stock=Sin%20Stock',
          })
        }
      })
    )
  }

  if (canViewPayments) {
    tasks.push(
      countOverdueCredits().then((count) => {
        if (count > 0) {
          out.push({
            id: 'credits_overdue',
            kind: 'credits_overdue',
            title: 'Créditos vencidos',
            description:
              count === 1 ? '1 crédito con saldo vencido' : `${count} créditos con saldo vencido`,
            count,
            href: '/payments?status=overdue',
          })
        }
      })
    )
  }

  if (canViewSupplierInvoices) {
    tasks.push(
      countOverdueSupplierInvoices().then((count) => {
        if (count > 0) {
          out.push({
            id: 'supplier_invoices_overdue',
            kind: 'supplier_invoices_overdue',
            title: 'Facturas proveedor vencidas',
            description:
              count === 1
                ? '1 factura de proveedor vencida'
                : `${count} facturas de proveedor vencidas`,
            count,
            href: '/purchases/invoices',
          })
        }
      })
    )
  }

  await Promise.allSettled(tasks)

  const order: AppNotificationKind[] = [
    'receptions_pending',
    'products_out_of_stock',
    'credits_overdue',
    'supplier_invoices_overdue',
  ]
  return order
    .map((kind) => out.find((n) => n.kind === kind))
    .filter((n): n is AppNotification => Boolean(n))
}

export function totalNotificationCount(notifications: AppNotification[]): number {
  return notifications.reduce((sum, n) => sum + n.count, 0)
}
