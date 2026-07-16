'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/** Alterna sistema → claro → oscuro (icono según tema efectivo). */
export function TopBarThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycle = () => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon =
    theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  const label =
    theme === 'system'
      ? 'Tema: según dispositivo'
      : theme === 'light'
        ? 'Tema: claro'
        : 'Tema: oscuro'

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        className
      )}
    >
      <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.5} aria-hidden />
    </button>
  )
}
