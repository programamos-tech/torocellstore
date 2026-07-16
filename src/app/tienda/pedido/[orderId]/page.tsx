import { getTiendaWebOrderByToken } from '@/lib/tienda-orders-service'
import { OrderConfirmationClient } from '@/components/tienda/order-confirmation-client'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function TiendaOrderPage({ params, searchParams }: Props) {
  const { orderId } = await params
  const { token = '' } = await searchParams
  const order = token ? await getTiendaWebOrderByToken(orderId, token) : null

  return <OrderConfirmationClient orderId={orderId} token={token} initialOrder={order} />
}
