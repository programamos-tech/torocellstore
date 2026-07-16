import { NextRequest, NextResponse } from 'next/server'
import { getTiendaWebOrderByToken } from '@/lib/tienda-orders-service'

type Props = { params: Promise<{ orderId: string }> }

export async function GET(request: NextRequest, { params }: Props) {
  const { orderId } = await params
  const token = request.nextUrl.searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const order = await getTiendaWebOrderByToken(orderId, token)
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ order })
}
