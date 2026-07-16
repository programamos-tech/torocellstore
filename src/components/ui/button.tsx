import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * CTA de marca: primario sólido emerald (claro y oscuro).
 * Outline / secondary para acciones secundarias; sin sombra agresiva.
 */
export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-emerald-400/30 dark:focus-visible:ring-offset-zinc-950',
        variant === 'default' &&
          'rounded-lg border border-emerald-600 bg-emerald-600 text-white shadow-none hover:border-emerald-500 hover:bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:border-emerald-400 dark:hover:bg-emerald-400',
        variant === 'destructive' &&
          'rounded-lg border border-red-600/90 bg-red-600 text-white shadow-none hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
        variant === 'outline' &&
          'rounded-lg border border-zinc-300 bg-white text-zinc-800 shadow-none hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70',
        variant === 'secondary' &&
          'rounded-lg border border-emerald-600/25 bg-emerald-50 text-emerald-900 shadow-none hover:border-emerald-600/40 hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/75',
        variant === 'ghost' &&
          'rounded-lg border border-transparent text-zinc-700 shadow-none hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
        variant === 'link' &&
          'rounded-md text-emerald-700 shadow-none underline-offset-4 hover:underline dark:text-emerald-400',
        {
          'min-h-10 px-5 text-sm': size === 'default',
          'h-9 px-3.5 text-sm': size === 'sm',
          'min-h-12 px-6 text-base': size === 'lg',
          'h-10 w-10 shrink-0 p-0': size === 'icon',
        },
        className
      )}
      {...props}
    />
  )
}
