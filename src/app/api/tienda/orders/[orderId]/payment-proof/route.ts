import { NextRequest, NextResponse } from 'next/server'
import { attachTiendaPaymentProof } from '@/lib/tienda-orders-service'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_BYTES = 2 * 1024 * 1024

type Props = { params: Promise<{ orderId: string }> }

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { orderId } = await params
    const formData = await request.formData()
    const token = String(formData.get('token') ?? '').trim()
    const file = formData.get('file') as File | null

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Sube una imagen del comprobante' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen no debe superar 2 MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt) ? fileExt : 'jpg'
    const filePath = `orders/${orderId}/${Date.now()}.${safeExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('tienda-payment-proofs')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      return NextResponse.json({ error: 'No se pudo subir el comprobante' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('tienda-payment-proofs')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'No se pudo obtener la URL del comprobante' }, { status: 500 })
    }

    const order = await attachTiendaPaymentProof(orderId, token, urlData.publicUrl)
    return NextResponse.json({ order })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al subir comprobante'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
