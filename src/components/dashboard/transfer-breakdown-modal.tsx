'use client'

import { Landmark } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TransferProvider } from '@/types'
import { getTransferProviderLabel } from '@/lib/payment-methods'

type TransferBreakdown = Record<TransferProvider | 'unknown', number>

interface TransferBreakdownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breakdown: TransferBreakdown
  total: number
  formatCurrency: (amount: number) => string
}

const ROWS: Array<TransferProvider | 'unknown'> = [
  'nequi',
  'daviplata',
  'bancolombia',
  'unknown',
]

export function TransferBreakdownModal({
  open,
  onOpenChange,
  breakdown,
  total,
  formatCurrency,
}: TransferBreakdownModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md gap-0">
        <DialogHeader className="border-b border-zinc-200 px-5 py-4 pr-14 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Landmark className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Transferencias
          </DialogTitle>
          <DialogDescription>
            Desglose del período seleccionado en reportes.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
          {ROWS.map((provider) => (
            <div key={provider} className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {provider === 'unknown'
                  ? 'Sin especificar (histórico)'
                  : getTransferProviderLabel(provider)}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(breakdown[provider])}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Total transferencias
          </span>
          <span className="text-lg font-bold tabular-nums text-sky-700 dark:text-sky-400">
            {formatCurrency(total)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
