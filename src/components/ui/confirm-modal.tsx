'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODAL_BACKDROP_PAD } from '@/config/modal-layout'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

/** Diálogo corto de confirmación — no usar el panel ancho de formularios. */
const CONFIRM_PANEL =
  'flex w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl'

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const Icon = type === 'info' ? Info : AlertTriangle
  const iconClass =
    type === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : type === 'warning'
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-sky-600 dark:text-sky-400'

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-56',
        MODAL_BACKDROP_PAD
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
          CONFIRM_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <div className="flex min-w-0 items-start gap-2.5">
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} strokeWidth={1.75} aria-hidden />
            <h2
              id="confirm-modal-title"
              className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-4 py-4">
          <p
            id="confirm-modal-desc"
            className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            {message}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={type === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            className={cn(
              type === 'warning' &&
                'border-amber-600/90 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
