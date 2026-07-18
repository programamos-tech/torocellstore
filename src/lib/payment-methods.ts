import type { SalePaymentMethod, TransferProvider } from '@/types'

export const TRANSFER_PROVIDER_OPTIONS: Array<{
  value: TransferProvider
  label: string
}> = [
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'bancolombia', label: 'Bancolombia' },
]

export function getTransferProviderLabel(provider?: TransferProvider | null): string {
  return (
    TRANSFER_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ||
    'Sin especificar'
  )
}

export function getPaymentMethodLabel(method: SalePaymentMethod | string): string {
  switch (method) {
    case 'cash':
      return 'Efectivo'
    case 'credit':
      return 'Crédito'
    case 'transfer':
      return 'Transferencia'
    case 'card':
      return 'Tarjeta / datáfono'
    case 'warranty':
      return 'Garantía'
    case 'mixed':
      return 'Mixto'
    default:
      return method
  }
}
