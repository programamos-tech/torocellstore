'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const btn =
  'flex h-9 min-w-0 flex-1 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50'

const selected =
  'bg-zinc-700/80 text-zinc-100 shadow-sm ring-1 ring-zinc-600/90'
const idle =
  'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'

/**
 * Claro / oscuro fijos o según `prefers-color-scheme` (localStorage `light` | `dark` | `system`).
 */
export function SidebarThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={cn(
        'flex gap-1 rounded-lg border border-zinc-700/90 bg-zinc-900/70 p-1',
        className
      )}
      role="group"
      aria-label="Tema de la interfaz"
    >
      <button
        type="button"
        title="Según el dispositivo"
        aria-label="Según el dispositivo"
        aria-pressed={theme === 'system'}
        className={cn(btn, theme === 'system' ? selected : idle)}
        onClick={() => setTheme('system')}
      >
        <Monitor className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo claro"
        aria-label="Modo claro"
        aria-pressed={theme === 'light'}
        className={cn(btn, theme === 'light' ? selected : idle)}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo oscuro"
        aria-label="Modo oscuro"
        aria-pressed={theme === 'dark'}
        className={cn(btn, theme === 'dark' ? selected : idle)}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
