'use client'

import { CreditCard, Landmark } from 'lucide-react'
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
  /** Solo transferencias bancarias / billeteras */
  transferTotal: number
  /** Tarjeta / datáfono (se muestra dentro del mismo desglose) */
  cardAmount?: number
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
  transferTotal,
  cardAmount = 0,
  formatCurrency,
}: TransferBreakdownModalProps) {
  const grandTotal = transferTotal + cardAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md gap-0">
        <DialogHeader className="border-b border-zinc-200 px-5 py-4 pr-14 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Landmark className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Transferencias y datáfono
          </DialogTitle>
          <DialogDescription>
            Desglose del período: a dónde se fue el dinero.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
          <p className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Transferencias
          </p>
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

          <p className="pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Tarjeta
          </p>
          <div className="flex items-center justify-between gap-4 py-3.5">
            <span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <CreditCard className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              Tarjeta / datáfono
            </span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(cardAmount)}
            </span>
          </div>
        </div>

        <div className="space-y-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Solo transferencias</span>
            <span className="text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
              {formatCurrency(transferTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Total (transferencias + datáfono)
            </span>
            <span className="text-lg font-bold tabular-nums text-sky-700 dark:text-sky-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
