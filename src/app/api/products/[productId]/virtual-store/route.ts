import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-auth'
import { canManageVirtualStoreCatalog } from '@/lib/permissions'
import { ProductsService } from '@/lib/products-service'

type RouteContext = { params: Promise<{ productId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getRequestUser()
    if (!user || !canManageVirtualStoreCatalog(user)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { productId } = await context.params
    if (!productId?.trim()) {
      return NextResponse.json({ error: 'Producto inválido' }, { status: 400 })
    }

    const body = await request.json()
    const updates: { onlinePrice?: number; imageUrl?: string | null } = {}

    if ('onlinePrice' in body) {
      const onlinePrice = Number(body.onlinePrice)
      if (!Number.isFinite(onlinePrice) || onlinePrice < 0) {
        return NextResponse.json({ error: 'Precio tienda virtual inválido' }, { status: 400 })
      }
      updates.onlinePrice = onlinePrice
    }

    if ('imageUrl' in body) {
      const imageUrl = body.imageUrl
      if (imageUrl !== null && typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'URL de imagen inválida' }, { status: 400 })
      }
      updates.imageUrl = imageUrl?.trim() ? imageUrl.trim() : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
    }

    const ok = await ProductsService.updateVirtualStoreListing(productId.trim(), updates, {
      storeId: user.storeId ?? null,
      currentUserId: user.id,
    })

    if (!ok) {
      return NextResponse.json({ error: 'No se pudo actualizar el catálogo web' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('virtual-store PATCH:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
