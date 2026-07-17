'use client'

import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'

export interface AddServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (description: string, unitPrice: number) => void
  formatNumber: (value: number) => string
  parseNumber: (value: string) => number
}

export function AddServiceDialog({
  open,
  onOpenChange,
  onAdd,
  formatNumber,
  parseNumber,
}: AddServiceDialogProps) {
  const [description, setDescription] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setDescription('')
      setPriceInput('')
      setError('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = description.trim()
    const price = parseNumber(priceInput)

    if (!trimmed) {
      setError('Ingresa la descripción del servicio')
      return
    }
    if (!price || price <= 0) {
      setError('Ingresa el valor del servicio')
      return
    }

    onAdd(trimmed, price)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-[#DB462D]" strokeWidth={1.5} />
              Agregar servicio
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Reparación o mantenimiento: describe el trabajo y el valor a cobrar. No descuenta stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Descripción del servicio
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (error) setError('')
                }}
                rows={3}
                placeholder="Ej. Cambio de batería iPhone 17 Pro Max"
                className={cn(inputClass, 'min-h-[5.5rem] resize-y')}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Valor
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => {
                  const numeric = parseNumber(e.target.value)
                  setPriceInput(numeric > 0 ? formatNumber(numeric) : '')
                  if (error) setError('')
                }}
                placeholder="0"
                className={cn(inputClass, 'font-semibold tabular-nums')}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#DB462D] hover:bg-[#c03d27]">
              Agregar a la factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
