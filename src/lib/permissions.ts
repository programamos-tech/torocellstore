import type { Permission, User } from '@/types'

function isSuperAdminRole(role: string | undefined): boolean {
  const roleNorm = (role || '').toLowerCase().trim()
  return (
    roleNorm === 'superadmin' ||
    (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))
  )
}

const GESTOR_VIRTUAL_STORE_ACTIONS = ['view', 'edit'] as const

const DEFAULT_VENDEDOR_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['view', 'create', 'edit', 'delete', 'cancel'],
  clients: ['view', 'create', 'edit', 'delete', 'cancel'],
  sales: ['view', 'create', 'edit', 'delete', 'cancel'],
  payments: ['view', 'create', 'edit', 'delete', 'cancel'],
}

/** Comprueba permisos de módulo/acción (compartido cliente y servidor). */
export function checkPermission(user: User | null | undefined, module: string, action: string): boolean {
  if (!user) return false

  if (isSuperAdminRole(user.role)) return true

  if (module === 'dashboard' && action === 'view') return true

  const userRole = user.role?.toLowerCase() || ''

  if (userRole === 'inventario' && module === 'products') {
    return ['view', 'create', 'edit', 'delete', 'cancel'].includes(action)
  }

  if (userRole === 'gestor_tienda_virtual') {
    if (module === 'virtual_store') {
      return GESTOR_VIRTUAL_STORE_ACTIONS.includes(action as (typeof GESTOR_VIRTUAL_STORE_ACTIONS)[number])
    }
    return false
  }

  if (userRole === 'vendedor' || userRole === 'vendedora') {
    if (module === 'products') return action === 'view'
    if (module === 'transfers') return false
    if (module === 'sales' && action === 'create') return true

    const hasExplicitPermissions =
      user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
    if (!hasExplicitPermissions) {
      return (DEFAULT_VENDEDOR_PERMISSIONS[module] || []).includes(action)
    }
  }

  if (!user.permissions || !Array.isArray(user.permissions) || user.permissions.length === 0) {
    return false
  }

  const modulePermission = user.permissions.find((p: Permission) => p.module === module)
  if (!modulePermission) {
    if (userRole === 'vendedor' || userRole === 'vendedora') {
      return (DEFAULT_VENDEDOR_PERMISSIONS[module] || []).includes(action)
    }
    return false
  }

  const actions = modulePermission.actions || (modulePermission as Permission & { permissions?: string[] }).permissions || []
  if (!Array.isArray(actions)) {
    if (userRole === 'vendedor' || userRole === 'vendedora') {
      return (DEFAULT_VENDEDOR_PERMISSIONS[module] || []).includes(action)
    }
    return false
  }

  const hasAction = actions.includes(action)
  if (!hasAction && (userRole === 'vendedor' || userRole === 'vendedora')) {
    return (DEFAULT_VENDEDOR_PERMISSIONS[module] || []).includes(action)
  }

  return hasAction
}

export function canManageVirtualStoreCatalog(user: User | null | undefined): boolean {
  return (
    checkPermission(user, 'virtual_store', 'edit') || checkPermission(user, 'products', 'edit')
  )
}
