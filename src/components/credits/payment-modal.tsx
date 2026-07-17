'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  X,
  DollarSign,
  CreditCard,
  Banknote,
  Shuffle,
  AlertCircle,
  Coins,
} from 'lucide-react'
import { Credit, PaymentRecord } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUser } from '@/lib/store-helper'
import { cn } from '@/lib/utils'
import { MODAL_BACKDROP_PAD } from '@/config/modal-layout'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPayment: (paymentData: Partial<PaymentRecord>) => void
  credit: Credit | null
}

/** Abono: diálogo compacto, no el ancho de formularios grandes. */
const PAYMENT_PANEL =
  'flex w-full max-w-lg max-h-[calc(100dvh-2.5rem)] flex-col overflow-hidden rounded-2xl shadow-2xl'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20'

export function PaymentModal({ isOpen, onClose, onAddPayment, credit }: PaymentModalProps) {
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'transfer' as 'cash' | 'transfer' | 'mixed',
    cashAmount: '',
    transferAmount: '',
    receivedAmount: '',
    description: '',
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const formatNumber = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '')
    if (!numericValue) return ''
    return parseInt(numericValue, 10).toLocaleString('es-CO')
  }

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/[^\d]/g, '')) || 0
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n)

  const handleNumberChange = (field: string, value: string) => {
    const formatted = formatNumber(value)
    setFormData((prev) => ({ ...prev, [field]: formatted }))

    if (field === 'amount' && credit) {
      const amountValue = parseFormattedNumber(formatted)
      if (amountValue > credit.pendingAmount) {
        setErrors((prev) => ({
          ...prev,
          amount: `El monto no puede exceder el saldo pendiente (${formatCurrency(credit.pendingAmount)})`,
        }))
      } else if (errors.amount) {
        setErrors((prev) => ({ ...prev, amount: '' }))
      }
    }

    if (field !== 'amount' && errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      paymentMethod: 'transfer',
      cashAmount: '',
      transferAmount: '',
      receivedAmount: '',
      description: '',
    })
    setErrors({})
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handlePaymentMethodChange = (value: 'cash' | 'transfer' | 'mixed') => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: value,
      cashAmount: '',
      transferAmount: '',
      receivedAmount: '',
    }))
    setErrors({})
  }

  const calculateChange = (): number => {
    if (formData.paymentMethod === 'transfer') return 0
    if (!formData.amount || !formData.receivedAmount) return 0

    const amountValue = parseFormattedNumber(formData.amount)
    const receivedValue = parseFormattedNumber(formData.receivedAmount)

    if (formData.paymentMethod === 'cash') {
      return receivedValue > amountValue ? receivedValue - amountValue : 0
    }
    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      return receivedValue > cashValue ? receivedValue - cashValue : 0
    }
    return 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!credit) return

    const nextErrors: { [key: string]: string } = {}
    const amountValue = parseFormattedNumber(formData.amount)

    if (!formData.amount || amountValue <= 0) {
      nextErrors.amount = 'El monto debe ser mayor a 0'
    }
    if (amountValue > credit.pendingAmount) {
      nextErrors.amount = 'El monto no puede ser mayor al saldo pendiente'
    }

    if (formData.paymentMethod === 'cash') {
      if (formData.receivedAmount) {
        const receivedValue = parseFormattedNumber(formData.receivedAmount)
        if (receivedValue <= 0) {
          nextErrors.receivedAmount = 'El monto recibido debe ser mayor a 0'
        } else if (receivedValue < amountValue) {
          nextErrors.receivedAmount = 'El monto recibido no puede ser menor al monto del abono'
        }
      }
    }

    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      const transferValue = parseFormattedNumber(formData.transferAmount)
      const receivedValue = parseFormattedNumber(formData.receivedAmount)

      if (!formData.cashAmount || cashValue <= 0) {
        nextErrors.cashAmount = 'El monto en efectivo debe ser mayor a 0'
      }
      if (!formData.transferAmount || transferValue <= 0) {
        nextErrors.transferAmount = 'El monto por transferencia debe ser mayor a 0'
      }
      if (formData.receivedAmount) {
        if (receivedValue <= 0) {
          nextErrors.receivedAmount = 'El monto recibido en efectivo debe ser mayor a 0'
        } else if (receivedValue < cashValue) {
          nextErrors.receivedAmount = 'El monto recibido no puede ser menor al monto en efectivo'
        }
      }

      const totalMixed = cashValue + transferValue
      if (Math.abs(totalMixed - amountValue) > 0.01) {
        const difference = amountValue - totalMixed
        nextErrors.mixed =
          difference > 0
            ? `Faltan ${formatCurrency(difference)} para completar el monto total`
            : `Sobran ${formatCurrency(Math.abs(difference))} del monto total`
      }
    }

    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    let userId = user?.id
    let userName = user?.name
    if (!userId) {
      const currentUser = getCurrentUser()
      userId = currentUser?.id || undefined
      userName = currentUser?.name || userName
    }

    const paymentData: Partial<PaymentRecord> = {
      creditId: credit.id,
      amount: parseFormattedNumber(formData.amount),
      paymentDate: new Date().toISOString(),
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      userId: userId,
      userName: userName || 'Usuario Actual',
      createdAt: new Date().toISOString(),
    }

    if (formData.paymentMethod === 'mixed') {
      paymentData.cashAmount = parseFormattedNumber(formData.cashAmount)
      paymentData.transferAmount = parseFormattedNumber(formData.transferAmount)
    }

    onAddPayment(paymentData)
    onClose()
    resetForm()
  }

  if (!isOpen || !credit || !mounted || typeof document === 'undefined') return null

  const methodOptions = [
    {
      v: 'transfer' as const,
      label: 'Transferencia',
      Icon: CreditCard,
      active: 'bg-sky-600 text-white shadow-md ring-2 ring-sky-500/35 dark:bg-sky-500',
    },
    {
      v: 'cash' as const,
      label: 'Efectivo',
      Icon: Banknote,
      active: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 dark:bg-emerald-500',
    },
    {
      v: 'mixed' as const,
      label: 'Mixto',
      Icon: Shuffle,
      active: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-500/30 dark:bg-amber-500',
    },
  ]

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center zonat-modal-backdrop xl:left-56',
        MODAL_BACKDROP_PAD
      )}
    >
      <div
        className={cn(
          'zonat-preserve-surface border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950',
          PAYMENT_PANEL
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-payment-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-start gap-2.5">
            <DollarSign
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="credit-payment-modal-title"
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                Registrar abono
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-300">
                {credit.clientName} · {credit.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 dark:bg-zinc-950">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700/80 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Total crédito</span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(credit.totalAmount)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Pendiente</span>
                <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {formatCurrency(credit.pendingAmount)}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="abono-monto"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Monto del abono <span className="text-red-500">*</span>
              </label>
              <input
                id="abono-monto"
                type="text"
                value={formData.amount}
                onChange={(e) => handleNumberChange('amount', e.target.value)}
                placeholder="Ej: 500000"
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                  inputClass,
                  'h-12 text-lg font-semibold tabular-nums',
                  (errors.amount ||
                    (formData.amount &&
                      parseFormattedNumber(formData.amount) > credit.pendingAmount)) &&
                    'border-red-500/70 ring-1 ring-red-500/30'
                )}
              />
              {errors.amount ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors.amount}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Máximo: {formatCurrency(credit.pendingAmount)}
                </p>
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Método <span className="text-red-500">*</span>
              </span>
              <div className="flex gap-1.5 rounded-xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
                {methodOptions.map(({ v, label, Icon, active }) => {
                  const selected = formData.paymentMethod === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handlePaymentMethodChange(v)}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-[2.875rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all sm:flex-row sm:gap-2 sm:text-sm',
                        selected
                          ? active
                          : 'bg-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      <span className="leading-tight">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {(formData.paymentMethod === 'cash' || formData.paymentMethod === 'mixed') && (
              <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                <label
                  htmlFor="abono-recibido"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {formData.paymentMethod === 'cash'
                    ? 'Monto recibido'
                    : 'Monto recibido en efectivo'}{' '}
                  <span className="font-normal text-zinc-500">(opcional)</span>
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Para calcular vuelto respecto al efectivo del abono
                </p>
                <input
                  id="abono-recibido"
                  type="text"
                  value={formData.receivedAmount}
                  onChange={(e) => handleNumberChange('receivedAmount', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  autoComplete="off"
                  className={cn(
                    inputClass,
                    'h-11 text-base font-semibold tabular-nums',
                    errors.receivedAmount && 'border-red-500/70 ring-1 ring-red-500/30'
                  )}
                />
                {errors.receivedAmount && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.receivedAmount}</p>
                )}
                {formData.receivedAmount && formData.amount && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <Coins className="h-4 w-4 text-amber-500 dark:text-amber-400" strokeWidth={1.75} />
                      Vuelto
                    </span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.paymentMethod === 'mixed' && (
              <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Desglose del abono mixto
                </p>
                <div>
                  <label
                    htmlFor="abono-cash"
                    className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    Monto en efectivo
                  </label>
                  <input
                    id="abono-cash"
                    type="text"
                    value={formData.cashAmount}
                    onChange={(e) => handleNumberChange('cashAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(
                      inputClass,
                      'h-11 text-base tabular-nums',
                      errors.cashAmount && 'border-red-500/70'
                    )}
                  />
                  {errors.cashAmount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cashAmount}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="abono-transfer"
                    className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
                    Monto en transferencia
                  </label>
                  <input
                    id="abono-transfer"
                    type="text"
                    value={formData.transferAmount}
                    onChange={(e) => handleNumberChange('transferAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(
                      inputClass,
                      'h-11 text-base tabular-nums',
                      errors.transferAmount && 'border-red-500/70'
                    )}
                  />
                  {errors.transferAmount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.transferAmount}</p>
                  )}
                </div>
                {errors.mixed && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.mixed}</p>
                )}
                {formData.amount && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Total abono:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseFormattedNumber(formData.amount))}
                    </span>
                    {' · '}
                    Suma desglose:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(
                        parseFormattedNumber(formData.cashAmount) +
                          parseFormattedNumber(formData.transferAmount)
                      )}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="abono-notas"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Notas <span className="font-normal text-zinc-500">(opcional)</span>
              </label>
              <textarea
                id="abono-notas"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Observaciones sobre el abono…"
                rows={2}
                className={cn(inputClass, 'min-h-[4rem] resize-y')}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Registrar abono
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
