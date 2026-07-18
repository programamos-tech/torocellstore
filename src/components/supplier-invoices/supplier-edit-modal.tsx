'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Building2, X, User, Phone, Mail, FileText, Hash } from 'lucide-react'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { cn } from '@/lib/utils'
import { MODAL_BACKDROP_PAD } from '@/config/modal-layout'
import { toast } from 'sonner'
import { formatSupplierNumber } from '@/lib/supplier-number'

/** Formulario corto — no el ancho de “Nuevo producto”. */
const SUPPLIER_EDIT_PANEL =
  'flex w-full max-w-lg max-h-[calc(100dvh-2.5rem)] flex-col overflow-hidden rounded-2xl shadow-2xl'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

interface SupplierEditModalProps {
  isOpen: boolean
  onClose: () => void
  supplierId: string | null
  onSaved: () => void | Promise<void>
}

export function SupplierEditModal({ isOpen, onClose, supplierId, onSaved }: SupplierEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [supplierNumber, setSupplierNumber] = useState<number | null>(null)
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [document, setDocument] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isOpen || !supplierId?.trim()) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const s = await SupplierInvoicesService.getSupplierById(supplierId)
        if (cancelled) return
        if (!s) {
          setLoadError('No se encontró el proveedor o no tienes acceso.')
          return
        }
        setName(s.name || '')
        setSupplierNumber(s.supplierNumber)
        setContact(s.contact || '')
        setPhone(s.phone || '')
        setEmail(s.email || '')
        setDocument(s.document || '')
        setIsActive(s.isActive !== false)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Error al cargar el proveedor')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, supplierId])

  if (!isOpen || !supplierId?.trim()) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      await SupplierInvoicesService.updateSupplier(supplierId, {
        name: trimmedName,
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        document: document.trim(),
        isActive,
      })
      toast.success('Proveedor actualizado')
      await Promise.resolve(onSaved())
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-60',
        MODAL_BACKDROP_PAD
      )}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950',
          SUPPLIER_EDIT_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-edit-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-2.5">
            <Building2
              className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="supplier-edit-title"
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                Editar proveedor
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Actualiza los datos del proveedor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-sky-600 dark:border-zinc-700 dark:border-t-sky-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
          </div>
        ) : loadError ? (
          <div className="space-y-4 p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 dark:bg-zinc-950">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <Hash className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" strokeWidth={2} />
                  Número de proveedor
                </label>
                <div className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2.5 font-mono text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {formatSupplierNumber(supplierNumber)}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Se asigna automáticamente y no se puede modificar.
                </p>
              </div>

              <div>
                <label
                  htmlFor="supplier-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="supplier-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Accesorios Caribe SAS"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label
                  htmlFor="supplier-contact"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" strokeWidth={2} />
                  Contacto <span className="font-normal text-zinc-500">(opcional)</span>
                </label>
                <input
                  id="supplier-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Luis Peña"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="supplier-phone"
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    Teléfono <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                  <input
                    id="supplier-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="Ej: 315 700 8009"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label
                    htmlFor="supplier-email"
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <Mail className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" strokeWidth={2} />
                    Correo <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                  <input
                    id="supplier-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="supplier-document"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" strokeWidth={2} />
                  NIT / documento <span className="font-normal text-zinc-500">(opcional)</span>
                </label>
                <input
                  id="supplier-document"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: 900555666-8"
                />
              </div>

              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border px-3 py-3',
                  isActive
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] dark:border-emerald-400/35 dark:bg-emerald-500/10'
                    : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Proveedor activo</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Si lo desactivas, no aparecerá al crear facturas nuevas.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
