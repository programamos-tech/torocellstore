'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Tag, Plus, Trash2, FileText } from 'lucide-react'
import { Category } from '@/types'
import { cn } from '@/lib/utils'
import { MODAL_PANEL, MODAL_BACKDROP_PAD } from '@/config/modal-layout'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void
  onToggleStatus: (categoryId: string, newStatus: 'active' | 'inactive') => void
  onDelete: (categoryId: string) => void
  categories: Category[]
}

const fieldLabel = 'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300'
const fieldInput =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500'
const sectionTitle = 'flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100'
const modalCard =
  'rounded-xl border border-zinc-200 bg-white shadow-none outline-none dark:border-zinc-700 dark:bg-zinc-900'

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
  categories,
}: CategoryModalProps) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      case 'inactive':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'inactive':
        return 'Inactiva'
      default:
        return status
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido'
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSave = () => {
    if (!validateForm()) return
    onSave({
      name: formData.name.trim(),
      description: formData.description.trim(),
      status: formData.status,
    })
    setFormData({ name: '', description: '', status: 'active' })
    setErrors({})
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', status: 'active' })
    setErrors({})
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-60',
        MODAL_BACKDROP_PAD
      )}
    >
      <div
        className={cn(
          MODAL_PANEL,
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <Tag className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} aria-hidden />
            <div className="min-w-0">
              <h2
                id="category-modal-title"
                className="text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg"
              >
                Gestión de categorías
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Crea nuevas categorías y gestiona las existentes
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        <form
          onSubmit={e => {
            e.preventDefault()
            handleSave()
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 px-3 py-3 scrollbar-hide dark:bg-zinc-950 sm:px-5 sm:py-4 lg:overflow-hidden">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 lg:items-stretch lg:h-full">
              {/* Formulario */}
              <div className={cn(modalCard, 'flex flex-col p-4')}>
                <div className={cn(sectionTitle, 'mb-3')}>
                  <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.5} aria-hidden />
                  Información de la categoría
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={fieldLabel}>
                      Nombre <span className="text-zinc-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className={cn(fieldInput, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                      placeholder="Nombre de la categoría"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className={fieldLabel}>
                      Descripción <span className="text-zinc-400">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => handleInputChange('description', e.target.value)}
                      className={cn(
                        'min-h-[5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100',
                        errors.description && 'border-red-500/70 ring-1 ring-red-500/30'
                      )}
                      placeholder="Descripción de la categoría"
                      rows={3}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className={fieldLabel}>Estado</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['active', 'inactive'] as const).map(status => {
                        const selected = formData.status === status
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleInputChange('status', status)}
                            className={cn(
                              'rounded-lg border px-3 py-2.5 text-left transition-colors',
                              selected
                                ? 'border-emerald-500/50 bg-emerald-500/[0.08] dark:border-emerald-500/40 dark:bg-emerald-500/10'
                                : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'h-2.5 w-2.5 rounded-full',
                                  selected ? 'bg-emerald-500' : 'bg-zinc-400'
                                )}
                              />
                              <div>
                                <div
                                  className={cn(
                                    'text-sm font-medium',
                                    selected
                                      ? 'text-emerald-700 dark:text-emerald-300'
                                      : 'text-zinc-700 dark:text-zinc-300'
                                  )}
                                >
                                  {getStatusLabel(status)}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {status === 'active' ? 'Disponible' : 'Deshabilitada'}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className={cn(modalCard, 'flex min-h-0 flex-col overflow-hidden')}>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <div className={sectionTitle}>
                    <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} aria-hidden />
                    Categorías existentes
                  </div>
                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {categories.length}
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 scrollbar-hide lg:max-h-[calc(100dvh-16rem)]">
                  {categories
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h4 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {cat.name}
                            </h4>
                            <Badge className={cn('text-[11px]', getStatusColor(cat.status))}>
                              {getStatusLabel(cat.status)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {cat.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleStatus(cat.id, cat.status === 'active' ? 'inactive' : 'active')
                            }
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                              cat.status === 'active'
                                ? 'bg-emerald-600'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                            title={cat.status === 'active' ? 'Desactivar' : 'Activar'}
                            aria-label={cat.status === 'active' ? 'Desactivar categoría' : 'Activar categoría'}
                          >
                            <span
                              className={cn(
                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                cat.status === 'active' ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
                              )}
                            />
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(cat.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {categories.length === 0 && (
                    <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      <Tag className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                      No hay categorías creadas
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5"
            style={{
              paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))',
            }}
          >
            <Button type="button" onClick={handleClose} variant="outline" size="sm">
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Crear categoría
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
