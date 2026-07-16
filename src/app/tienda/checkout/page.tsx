import { getTiendaCheckoutContext } from '@/lib/tienda-orders-service'
import { CheckoutPageClient } from '@/components/tienda/checkout-page-client'

export const dynamic = 'force-dynamic'

export default async function TiendaCheckoutPage() {
  const ctx = await getTiendaCheckoutContext()
  return (
    <CheckoutPageClient
      storeName={ctx?.store.name}
      bank={ctx?.bank ?? null}
    />
  )
}
