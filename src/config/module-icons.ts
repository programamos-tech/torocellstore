/**
 * Acentos de iconos por módulo (paleta Torocell).
 * Verde #69B275 · Azul #9DC2D1 · Amarillo #F7BE4B · Rojo #DB462D
 * No usar en el sidebar.
 */
export const moduleIcon = {
  products: 'text-emerald-600 dark:text-emerald-400',
  sales: 'text-amber-500 dark:text-amber-400',
  clients: 'text-sky-500 dark:text-sky-300',
  payments: 'text-amber-600 dark:text-amber-400',
  warranties: 'text-sky-600 dark:text-sky-400',
  invoices: 'text-red-500 dark:text-red-400',
  reports: 'text-emerald-600 dark:text-emerald-400',
  logs: 'text-sky-500 dark:text-sky-300',
  profile: 'text-sky-500 dark:text-sky-300',
  alert: 'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
} as const

/** Fondo suave + icono (cards / search / notificaciones) */
export const moduleIconSoft = {
  products: {
    wrap: 'bg-emerald-100 dark:bg-emerald-950/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  sales: {
    wrap: 'bg-amber-100 dark:bg-amber-950/50',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  clients: {
    wrap: 'bg-sky-100 dark:bg-sky-950/50',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  payments: {
    wrap: 'bg-amber-100 dark:bg-amber-950/50',
    icon: 'text-amber-700 dark:text-amber-400',
  },
  warranties: {
    wrap: 'bg-sky-100 dark:bg-sky-950/50',
    icon: 'text-sky-700 dark:text-sky-400',
  },
  invoices: {
    wrap: 'bg-red-100 dark:bg-red-950/50',
    icon: 'text-red-600 dark:text-red-400',
  },
  reports: {
    wrap: 'bg-emerald-100 dark:bg-emerald-950/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  alert: {
    wrap: 'bg-red-100 dark:bg-red-950/50',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    wrap: 'bg-amber-100 dark:bg-amber-950/50',
    icon: 'text-amber-700 dark:text-amber-400',
  },
} as const

export type ModuleIconKey = keyof typeof moduleIcon
