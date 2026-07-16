import { NextRequest, NextResponse } from 'next/server'
import { createTiendaWebOrder } from '@/lib/tienda-orders-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const lines = Array.isArray(body?.lines) ? body.lines : []
    const customer = body?.customer

    if (!customer?.name?.trim() || !customer?.phone?.trim() || !customer?.address?.trim() || !customer?.city?.trim()) {
      return NextResponse.json(
        { error: 'Completa nombre, teléfono, ciudad y dirección' },
        { status: 400 }
      )
    }

    const order = await createTiendaWebOrder(lines, {
      name: String(customer.name),
      phone: String(customer.phone),
      email: customer.email ? String(customer.email) : undefined,
      city: String(customer.city),
      address: String(customer.address),
      notes: customer.notes ? String(customer.notes) : undefined
    })

    return NextResponse.json({ order })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el pedido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
