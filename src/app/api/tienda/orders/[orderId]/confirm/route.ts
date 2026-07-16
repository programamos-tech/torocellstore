import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-auth'
import { confirmTiendaWebOrder } from '@/lib/tienda-orders-service'

type Props = { params: Promise<{ orderId: string }> }

export async function POST(_request: NextRequest, { params }: Props) {
  try {
    const user = await getRequestUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (user.role ?? '').toLowerCase()
    const allowed = ['superadmin', 'admin', 'vendedor', 'supervisor_tienda', 'gestor_tienda_virtual'].includes(
      role
    )
    if (!allowed) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { orderId } = await params
    await confirmTiendaWebOrder(orderId, user.id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo confirmar el pedido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
