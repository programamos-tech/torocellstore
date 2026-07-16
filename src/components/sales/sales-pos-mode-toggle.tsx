'use client'

import { LayoutGrid, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSalesPosPreference } from '@/hooks/use-sales-pos-preference'

interface SalesPosModeToggleProps {
  className?: string
  compact?: boolean
}

export function SalesPosModeToggle({ className, compact = false }: SalesPosModeToggleProps) {
  const { posMode, setPosMode, ready } = useSalesPosPreference()

  if (!ready) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-800">
          {posMode ? (
            <LayoutGrid className="h-5 w-5 text-zinc-600 dark:text-zinc-300" strokeWidth={1.5} />
          ) : (
            <Monitor className="h-5 w-5 text-zinc-600 dark:text-zinc-300" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Pantalla tipo POS en facturas
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {compact
              ? 'Botones grandes con los más vendidos al crear ventas.'
              : 'Activa una interfaz táctil con los productos más vendidos al facturar. La búsqueda por referencia sigue disponible.'}
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={posMode}
              onChange={(e) => setPosMode(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {posMode ? 'Modo POS activo' : 'Usar modo clásico'}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
