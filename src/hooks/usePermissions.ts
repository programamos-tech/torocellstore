'use client'

import { User } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { checkPermission } from '@/lib/permissions'

export function usePermissions() {
  const { user: currentUser } = useAuth()

  const hasPermission = (module: string, action: string): boolean => {
    return checkPermission(currentUser, module, action)
  }

  const canView = (module: string): boolean => hasPermission(module, 'view')
  const canCreate = (module: string): boolean => hasPermission(module, 'create')
  const canEdit = (module: string): boolean => hasPermission(module, 'edit')
  const canDelete = (module: string): boolean => hasPermission(module, 'delete')
  const canCancel = (module: string): boolean => hasPermission(module, 'cancel')

  const getAccessibleModules = (): string[] => {
    if (!currentUser) return []

    const roleNorm = (currentUser.role || '').toLowerCase().trim()
    if (
      roleNorm === 'superadmin' ||
      (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))
    ) {
      return [
        'dashboard',
        'products',
        'virtual_store',
        'transfers',
        'receptions',
        'clients',
        'sales',
        'payments',
        'supplier_invoices',
        'warranties',
        'roles',
        'logs',
        'stores',
      ]
    }

    if (roleNorm === 'gestor_tienda_virtual') {
      return ['virtual_store']
    }

    if (currentUser.role?.toLowerCase() === 'inventario') {
      const fromPermissions =
        currentUser.permissions && Array.isArray(currentUser.permissions)
          ? currentUser.permissions
              .filter((p) => (p.actions || p.permissions || []).includes('view'))
              .map((p) => p.module)
          : []
      return Array.from(new Set(['dashboard', ...fromPermissions]))
    }

    if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) return []

    const modules = currentUser.permissions
      .filter((p) => {
        const actions = p.actions || p.permissions || []
        return Array.isArray(actions) && actions.includes('view')
      })
      .map((p) => p.module)

    return Array.from(new Set(['dashboard', ...modules]))
  }

  const getModuleActions = (module: string): string[] => {
    if (!currentUser) return []

    const roleNorm = (currentUser.role || '').toLowerCase().trim()
    if (
      roleNorm === 'superadmin' ||
      (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))
    ) {
      return ['view', 'create', 'edit', 'delete', 'cancel']
    }

    if (roleNorm === 'gestor_tienda_virtual' && module === 'virtual_store') {
      return ['view', 'edit']
    }

    if (currentUser.role?.toLowerCase() === 'inventario' && module === 'products') {
      return ['view', 'create', 'edit', 'delete', 'cancel']
    }

    if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) return []

    const modulePermission = currentUser.permissions.find((p) => p.module === module)
    if (!modulePermission) return []

    const actions = modulePermission.actions || modulePermission.permissions || []
    return Array.isArray(actions) ? actions : []
  }

  return {
    currentUser,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canCancel,
    getAccessibleModules,
    getModuleActions,
  }
}
