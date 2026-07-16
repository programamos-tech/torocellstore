import type { AppNotification, AppNotificationKind } from './app-notifications-service'

const STORAGE_PREFIX = 'zonat:notifications-seen'

/** Tiempo que un aviso visto sigue listado aunque el conteo no cambie. */
export const NOTIFICATION_LIST_RETENTION_MS = 24 * 60 * 60 * 1000

export type NotificationSeenEntry = {
  /** Conteo reconocido al ver el aviso. */
  acknowledgedCount: number
  seenAt: string
}

export type NotificationSeenState = Partial<Record<AppNotificationKind, NotificationSeenEntry>>

function storageKey(userId: string, storeId: string | null | undefined): string {
  const store = storeId?.trim() || 'main'
  return `${STORAGE_PREFIX}:${userId}:${store}`
}

export function getNotificationSeenState(
  userId: string,
  storeId?: string | null
): NotificationSeenState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(storageKey(userId, storeId))
    if (!raw) return {}
    return JSON.parse(raw) as NotificationSeenState
  } catch {
    return {}
  }
}

export function markNotificationsSeen(
  userId: string,
  storeId: string | null | undefined,
  items: Pick<AppNotification, 'kind' | 'count'>[]
): void {
  if (typeof window === 'undefined' || items.length === 0) return
  const state = getNotificationSeenState(userId, storeId)
  const now = new Date().toISOString()
  for (const item of items) {
    state[item.kind] = {
      acknowledgedCount: item.count,
      seenAt: now,
    }
  }
  try {
    localStorage.setItem(storageKey(userId, storeId), JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

export function markNotificationKindSeen(
  userId: string,
  storeId: string | null | undefined,
  kind: AppNotificationKind,
  count: number
): void {
  markNotificationsSeen(userId, storeId, [{ kind, count }])
}

function isWithinRetention(seenAt: string, now = Date.now()): boolean {
  const t = new Date(seenAt).getTime()
  if (Number.isNaN(t)) return false
  return now - t < NOTIFICATION_LIST_RETENTION_MS
}

/**
 * Lista avisos activos: siempre los no vistos; los vistos se mantienen 24 h
 * aunque el conteo no cambie. Después de 24 h solo reaparecen si el conteo subió.
 */
export function filterNotificationsForDisplay(
  userId: string,
  storeId: string | null | undefined,
  notifications: AppNotification[]
): AppNotification[] {
  const seen = getNotificationSeenState(userId, storeId)
  const now = Date.now()

  return notifications.filter((n) => {
    const entry = seen[n.kind]
    if (!entry) return true
    if (n.count > entry.acknowledgedCount) return true
    return isWithinRetention(entry.seenAt, now)
  })
}

/** @deprecated Usar filterNotificationsForDisplay */
export function filterUnseenNotifications(
  userId: string,
  storeId: string | null | undefined,
  notifications: AppNotification[]
): AppNotification[] {
  return filterNotificationsForDisplay(userId, storeId, notifications)
}

/** Aviso no visto o con conteo mayor al último reconocido (para resaltar en badge). */
export function isNotificationUnread(
  userId: string,
  storeId: string | null | undefined,
  notification: Pick<AppNotification, 'kind' | 'count'>
): boolean {
  const seen = getNotificationSeenState(userId, storeId)
  const entry = seen[notification.kind]
  if (!entry) return true
  return notification.count > entry.acknowledgedCount
}

/** Suma conteos de avisos aún no reconocidos (badge más preciso). */
export function getUnreadNotificationBadgeCount(
  userId: string,
  storeId: string | null | undefined,
  notifications: AppNotification[]
): number {
  return notifications
    .filter((n) => isNotificationUnread(userId, storeId, n))
    .reduce((sum, n) => sum + n.count, 0)
}

export function isNotificationSeenWithinRetention(
  userId: string,
  storeId: string | null | undefined,
  kind: AppNotificationKind
): boolean {
  const entry = getNotificationSeenState(userId, storeId)[kind]
  if (!entry) return false
  return isWithinRetention(entry.seenAt)
}
