'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Package,
  Users,
  Receipt,
  CreditCard,
  Shield,
  Activity,
  ShieldCheck,
  UserCircle,
  UserCog,
  Warehouse,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { APP_VERSION } from '@/config/app-meta'
import type { Store } from '@/types/store'

const navigation = [
  { name: 'Reportes', href: '/reportes', icon: BarChart3, module: 'dashboard' },
  { 
    name: 'Inventario', 
    href: '/inventory/products', 
    icon: Warehouse, 
    module: 'products',
    submenu: [
      { name: 'Productos', href: '/inventory/products', icon: Package, module: 'products' },
    ]
  },
  { 
    name: 'Comercial', 
    href: '/clients', 
    icon: Users, 
    module: 'clients',
    submenu: [
      { name: 'Clientes', href: '/clients', icon: Users, module: 'clients' },
      { name: 'Ventas', href: '/sales', icon: Receipt, module: 'sales' },
      { name: 'Créditos', href: '/payments', icon: CreditCard, module: 'payments' },
      { name: 'Proveedores', href: '/purchases/invoices', icon: FileText, module: 'supplier_invoices' },
      { name: 'Garantías', href: '/warranties', icon: ShieldCheck, module: 'warranties' },
    ]
  },
  { 
    name: 'Administración', 
    href: '/roles', 
    icon: Shield, 
    module: 'roles',
    submenu: [
      { name: 'Roles', href: '/roles', icon: UserCog, module: 'roles' },
      { name: 'Actividades', href: '/logs', icon: Activity, module: 'logs' },
    ]
  },
  { name: 'Perfil', href: '/profile', icon: UserCircle, module: 'dashboard' },
]

interface SidebarProps {
  className?: string
  onMobileMenuToggle?: (isOpen: boolean) => void
}

export function Sidebar({ className, onMobileMenuToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { canView } = usePermissions()
  const { user } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  // Inicializar con todos los menús expandidos por defecto
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Inventario', 'Comercial', 'Administración']))

  // Mantener expandidos los menús cuando estamos en alguna de sus rutas
  useEffect(() => {
    if (pathname?.startsWith('/inventory')) {
      setExpandedMenus(prev => new Set([...prev, 'Inventario']))
    }
    if (pathname?.startsWith('/clients') || pathname?.startsWith('/sales') || pathname?.startsWith('/payments') || pathname?.startsWith('/purchases') || pathname?.startsWith('/warranties')) {
      setExpandedMenus(prev => new Set([...prev, 'Comercial']))
    }
    if (pathname?.startsWith('/roles') || pathname?.startsWith('/logs')) {
      setExpandedMenus(prev => new Set([...prev, 'Administración']))
    }
  }, [pathname])

  // Notificar al layout cuando cambie el estado del menú móvil
  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen)
  }, [isMobileMenuOpen, onMobileMenuToggle])

  // Cargar información de la tienda del usuario
  useEffect(() => {
    const loadStoreInfo = async () => {
      if (user?.storeId) {
        try {
          const store = await StoresService.getStoreById(user.storeId)
          setCurrentStore(store)
        } catch (error) {
          console.error('Error loading store info:', error)
        }
      } else {
        // Si no tiene storeId, es de la tienda principal
        try {
          const mainStore = await StoresService.getMainStore()
          setCurrentStore(mainStore)
        } catch (error) {
          console.error('Error loading main store:', error)
        }
      }
    }

    if (user) {
      loadStoreInfo()
    }
  }, [user])

  // Cerrar menú cuando se hace click fuera del sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* Mobile/Tablet menu button - solo visible cuando el sidebar está cerrado */}
      {/* Hidden hamburger on mobile: usamos bottom nav */}

      {/* Mobile/Tablet overlay - removido para evitar pantalla negra */}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          'zonat-preserve-surface fixed inset-y-0 left-0 z-40 w-60 transform overflow-hidden border-r border-zinc-800/90 bg-[#000000] transition-all duration-300 ease-in-out xl:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          /* Cerrado en móvil/tablet: sin pointer-events para que WebKit no intercepte toques en la barra inferior (z-40 compartida con bottom nav). */
          !isMobileMenuOpen && 'max-xl:pointer-events-none max-xl:invisible',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo y Tienda */}
          <div className="border-b border-zinc-800 px-3 py-4 transition-colors">
            <Link
              href="/reportes"
              className="relative flex flex-col items-center transition-opacity hover:opacity-90"
            >
              <div className="relative mb-2 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-black">
                <img
                  src={currentStore?.logo || '/logo.jpeg?v=2'}
                  alt={currentStore?.name || 'TOROCELL STORE'}
                  className="h-full w-full object-contain"
                />
              </div>
              {currentStore && (
                <p className="max-w-[180px] truncate text-center text-xs font-medium text-zinc-200">
                  {currentStore.name}
                </p>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
            {navigation.map((item) => {
              // Solo mostrar el item si el usuario tiene permisos para verlo
              if (!canView(item.module)) return null
              
              // Si requiere acceso a todas las tiendas, verificar
              if (item.requiresAllStoresAccess && !canAccessAllStores(user)) return null
              
              // Verificar si tiene submenú
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isExpanded = expandedMenus.has(item.name)
              
              // Verificar si algún subitem está activo
              const isSubmenuActive = hasSubmenu && item.submenu?.some(subitem => {
                if (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) return true
                if (subitem.href === '/clients' && pathname?.startsWith('/clients')) return true
                if (subitem.href === '/sales' && pathname?.startsWith('/sales')) return true
                if (subitem.href === '/payments' && pathname?.startsWith('/payments')) return true
                if (subitem.href === '/purchases/invoices' && pathname?.startsWith('/purchases')) return true
                if (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) return true
                if (subitem.href === '/roles' && pathname?.startsWith('/roles')) return true
                if (subitem.href === '/logs' && pathname?.startsWith('/logs')) return true
                return pathname === subitem.href
              })
              
              const isActive = pathname === item.href || 
                (item.href === '/payments' && pathname?.startsWith('/payments')) ||
                (item.href === '/inventory/products' && pathname?.startsWith('/inventory')) ||
                (item.href === '/clients' && (pathname?.startsWith('/clients') || pathname?.startsWith('/sales') || pathname?.startsWith('/payments') || pathname?.startsWith('/purchases') || pathname?.startsWith('/warranties'))) ||
                (item.href === '/roles' && (pathname?.startsWith('/roles') || pathname?.startsWith('/logs'))) ||
                isSubmenuActive
              
              const rowActive = 'bg-white/[0.08] text-zinc-50'
              const rowInactive =
                'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'

              const getIconColorForItem = (active: boolean) =>
                active
                  ? 'text-zinc-100'
                  : 'text-zinc-500 group-hover:text-zinc-300'

              const toggleSubmenu = (e: React.MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                setExpandedMenus(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(item.name)) {
                    newSet.delete(item.name)
                  } else {
                    newSet.add(item.name)
                  }
                  return newSet
                })
              }
              
              return (
                <div key={item.name}>
                  {hasSubmenu ? (
                    <>
                      <button
                        onClick={toggleSubmenu}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive || isSubmenuActive ? rowActive : rowInactive
                        )}
                      >
                        <div className="flex flex-1 items-center">
                          <item.icon
                            strokeWidth={1.5}
                            className={cn(
                              'mr-2.5 h-4 w-4 shrink-0 transition-colors',
                              getIconColorForItem(!!(isActive || isSubmenuActive))
                            )}
                          />
                          <span className="flex-1 truncate text-left">{item.name}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        ) : (
                          <ChevronRight strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        )}
                      </button>
                      {isExpanded && item.submenu && (
                        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-2">
                          {item.submenu.map((subitem) => {
                            if (!canView(subitem.module)) return null
                            
                            if (subitem.requiresAllStoresAccess && !canAccessAllStores(user)) return null
                            
                            const isSubActive = pathname === subitem.href ||
                              (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) ||
                              (subitem.href === '/clients' && pathname?.startsWith('/clients')) ||
                              (subitem.href === '/sales' && pathname?.startsWith('/sales')) ||
                              (subitem.href === '/payments' && pathname?.startsWith('/payments')) ||
                              (subitem.href === '/purchases/invoices' && pathname?.startsWith('/purchases')) ||
                              (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) ||
                              (subitem.href === '/roles' && pathname?.startsWith('/roles')) ||
                              (subitem.href === '/logs' && pathname?.startsWith('/logs'))

                            const getSubitemIconColor = () =>
                              isSubActive
                                ? 'text-zinc-100'
                                : 'text-zinc-500 group-hover:text-zinc-300'
                            
                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  'group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                                  isSubActive ? rowActive : rowInactive
                                )}
                              >
                                <subitem.icon
                                  strokeWidth={1.5}
                                  className={cn(
                                    'mr-2 h-3.5 w-3.5 shrink-0 transition-colors',
                                    getSubitemIconColor()
                                  )}
                                />
                                <span className="flex-1 truncate">{subitem.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? rowActive : rowInactive
                      )}
                    >
                      <item.icon
                        strokeWidth={1.5}
                        className={cn(
                          'mr-2.5 h-4 w-4 shrink-0 transition-colors',
                          getIconColorForItem(isActive)
                        )}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="border-t border-zinc-800 px-2.5 pb-3 pt-3">
            <p className="text-center text-[11px] font-medium leading-snug tracking-wide text-zinc-400">
              <span className="font-semibold text-zinc-300 tabular-nums">torocellstore v{APP_VERSION}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
