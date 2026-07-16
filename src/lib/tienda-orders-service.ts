import { randomUUID } from 'crypto'
import { getPublicCatalogStoreId } from '@/config/public-catalog'
import {
  TIENDA_PAYMENT_PROOF_MINUTES,
  resolveTiendaBankDetails,
  type TiendaBankDetails
} from '@/config/tienda-storefront'
import { SalesService } from '@/lib/sales-service'
import { supabaseAdmin } from '@/lib/supabase'
import type { PublicCatalogStoreInfo } from '@/lib/public-catalog'

export type TiendaCheckoutLineInput = {
  productId: string
  quantity: number
}

export type TiendaCheckoutCustomerInput = {
  name: string
  phone: string
  email?: string
  city: string
  address: string
  notes?: string
}

export type { TiendaBankDetails }

export type TiendaWebOrderSummary = {
  id: string
  checkoutToken: string
  invoiceNumber: string
  clientName: string
  total: number
  status: string
  paymentProofDeadline: string
  paymentProofUploadedAt: string | null
  paymentProofUrl: string | null
  bank: TiendaBankDetails
  storeName: string
}

type ValidatedLine = {
  productId: string
  name: string
  reference: string
  quantity: number
  unitPrice: number
  total: number
}

async function loadStoreCheckoutInfo(storeId: string) {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select(
      'id, name, city, address, phone, bank_name, bank_account_type, bank_account_number, bank_account_holder'
    )
    .eq('id', storeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  const store: PublicCatalogStoreInfo = {
    id: String(data.id),
    name: String(data.name ?? 'TOROCELL STORE').trim() || 'TOROCELL STORE',
    city: data.city != null ? String(data.city).trim() || null : null,
    address: data.address != null ? String(data.address).trim() || null : null,
    phone: data.phone != null ? String(data.phone).trim() || null : null
  }

  const bank = resolveTiendaBankDetails({
    bankName: data.bank_name,
    accountType: data.bank_account_type,
    accountNumber: data.bank_account_number,
    accountHolder: data.bank_account_holder,
    storeName: store.name
  })

  return { store, bank }
}

async function validateCartLines(
  storeId: string,
  lines: TiendaCheckoutLineInput[]
): Promise<{ items: ValidatedLine[]; subtotal: number }> {
  if (!lines.length) {
    throw new Error('El carrito está vacío')
  }

  const productSelect =
    'id, name, reference, online_price, price, status, products!inner(id, name, reference, online_price, status)'

  const validated: ValidatedLine[] = []

  for (const line of lines) {
    const productId = line.productId?.trim()
    const quantity = Math.floor(Number(line.quantity))
    if (!productId || quantity < 1 || quantity > 99) {
      throw new Error('Cantidad inválida en el carrito')
    }

    const { data: stockRow, error } = await supabaseAdmin
      .from('store_stock')
      .select(`quantity, online_price, products!inner(id, name, reference, online_price, status)`)
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .maybeSingle()

    if (error || !stockRow) {
      throw new Error('Un producto del carrito ya no está disponible')
    }

    const product = Array.isArray(stockRow.products) ? stockRow.products[0] : stockRow.products
    if (!product) {
      throw new Error('Producto no encontrado')
    }

    const status = String(product.status ?? 'active')
    if (status !== 'active' && status !== 'out_of_stock') {
      throw new Error(`"${product.name}" no está disponible`)
    }

    const available = Math.max(0, Math.floor(Number(stockRow.quantity ?? 0)))
    if (available < quantity) {
      throw new Error(`Stock insuficiente para "${product.name}"`)
    }

    const storeOnline = Number(stockRow.online_price ?? 0)
    const productOnline = Number(product.online_price ?? 0)
    const unitPrice = storeOnline > 0 ? storeOnline : productOnline > 0 ? productOnline : 0
    if (unitPrice <= 0) {
      throw new Error(`"${product.name}" no tiene precio web configurado`)
    }

    validated.push({
      productId,
      name: String(product.name ?? ''),
      reference: String(product.reference ?? ''),
      quantity,
      unitPrice,
      total: unitPrice * quantity
    })
  }

  const subtotal = validated.reduce((s, l) => s + l.total, 0)
  return { items: validated, subtotal }
}

async function findOrCreateWebClient(
  storeId: string,
  customer: TiendaCheckoutCustomerInput
): Promise<string> {
  const phone = customer.phone.replace(/\D/g, '')
  const name = customer.name.trim()

  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('store_id', storeId)
    .eq('phone', customer.phone.trim())
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await supabaseAdmin
      .from('clients')
      .update({
        name,
        email: customer.email?.trim() || null,
        address: customer.address.trim(),
        city: customer.city.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
    return String(existing.id)
  }

  const document = `WEB-${phone.slice(-10) || Date.now()}`
  const { data: created, error } = await supabaseAdmin
    .from('clients')
    .insert({
      name,
      email: customer.email?.trim() || null,
      phone: customer.phone.trim(),
      document,
      address: customer.address.trim(),
      city: customer.city.trim(),
      state: 'Sucre',
      type: 'consumidor_final',
      credit_limit: 0,
      current_debt: 0,
      status: 'active',
      store_id: storeId
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error('No se pudo registrar el cliente del pedido')
  }

  return String(created.id)
}

export async function getTiendaCheckoutContext() {
  const storeId = getPublicCatalogStoreId()
  if (!storeId) return null
  return loadStoreCheckoutInfo(storeId)
}

export async function createTiendaWebOrder(
  lines: TiendaCheckoutLineInput[],
  customer: TiendaCheckoutCustomerInput
): Promise<TiendaWebOrderSummary> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Servicio no disponible')
  }

  const storeId = getPublicCatalogStoreId()
  if (!storeId) {
    throw new Error('Tienda no configurada')
  }

  const ctx = await loadStoreCheckoutInfo(storeId)
  if (!ctx) {
    throw new Error('Tienda no encontrada')
  }

  const { items, subtotal } = await validateCartLines(storeId, lines)
  const clientId = await findOrCreateWebClient(storeId, customer)
  const invoiceNumber = await SalesService.getNextInvoiceNumber(storeId)
  const checkoutToken = randomUUID()
  const deadline = new Date(Date.now() + TIENDA_PAYMENT_PROOF_MINUTES * 60 * 1000)

  const { data: sale, error: saleError } = await supabaseAdmin
    .from('sales')
    .insert({
      client_id: clientId,
      client_name: customer.name.trim(),
      total: subtotal,
      subtotal,
      tax: 0,
      discount: 0,
      status: 'pending',
      payment_method: 'transfer',
      invoice_number: invoiceNumber,
      seller_id: null,
      seller_name: 'Tienda web',
      seller_email: null,
      store_id: storeId,
      order_source: 'web',
      customer_phone: customer.phone.trim(),
      customer_email: customer.email?.trim() || null,
      customer_address: `${customer.address.trim()} · ${customer.city.trim()}`,
      customer_notes: customer.notes?.trim() || null,
      payment_proof_deadline: deadline.toISOString(),
      checkout_token: checkoutToken
    })
    .select('id, invoice_number, client_name, total, status, payment_proof_deadline, checkout_token')
    .single()

  if (saleError || !sale) {
    throw new Error('No se pudo crear el pedido')
  }

  const saleItems = items.map((item) => ({
    sale_id: sale.id,
    product_id: item.productId,
    product_name: item.name,
    product_reference_code: item.reference || null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount: 0,
    total: item.total
  }))

  const { error: itemsError } = await supabaseAdmin.from('sale_items').insert(saleItems)
  if (itemsError) {
    await supabaseAdmin.from('sales').delete().eq('id', sale.id)
    throw new Error('No se pudieron guardar los productos del pedido')
  }

  const { error: paymentError } = await supabaseAdmin.from('payments').insert({
    sale_id: sale.id,
    client_id: clientId,
    client_name: customer.name.trim(),
    invoice_number: invoiceNumber,
    total_amount: subtotal,
    paid_amount: 0,
    pending_amount: subtotal,
    status: 'pending'
  })

  if (paymentError) {
    await supabaseAdmin.from('sales').delete().eq('id', sale.id)
    throw new Error('No se pudo registrar el pago pendiente')
  }

  return {
    id: String(sale.id),
    checkoutToken: String(sale.checkout_token),
    invoiceNumber: String(sale.invoice_number ?? ''),
    clientName: String(sale.client_name),
    total: Number(sale.total),
    status: String(sale.status),
    paymentProofDeadline: String(sale.payment_proof_deadline),
    paymentProofUploadedAt: null,
    paymentProofUrl: null,
    bank: ctx.bank,
    storeName: ctx.store.name
  }
}

export async function getTiendaWebOrderByToken(
  orderId: string,
  token: string
): Promise<TiendaWebOrderSummary | null> {
  if (!orderId?.trim() || !token?.trim()) return null

  const storeId = getPublicCatalogStoreId()
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select(
      'id, invoice_number, client_name, total, status, payment_proof_deadline, payment_proof_uploaded_at, payment_proof_url, checkout_token, store_id'
    )
    .eq('id', orderId.trim())
    .eq('order_source', 'web')
    .maybeSingle()

  if (error || !data || String(data.checkout_token) !== token.trim()) {
    return null
  }

  if (storeId && String(data.store_id) !== storeId) {
    return null
  }

  const ctx = await loadStoreCheckoutInfo(String(data.store_id))
  if (!ctx) return null

  return {
    id: String(data.id),
    checkoutToken: String(data.checkout_token),
    invoiceNumber: String(data.invoice_number ?? ''),
    clientName: String(data.client_name),
    total: Number(data.total),
    status: String(data.status),
    paymentProofDeadline: String(data.payment_proof_deadline),
    paymentProofUploadedAt: data.payment_proof_uploaded_at
      ? String(data.payment_proof_uploaded_at)
      : null,
    paymentProofUrl: data.payment_proof_url ? String(data.payment_proof_url) : null,
    bank: ctx.bank,
    storeName: ctx.store.name
  }
}

export async function attachTiendaPaymentProof(
  orderId: string,
  token: string,
  proofUrl: string
): Promise<TiendaWebOrderSummary> {
  const order = await getTiendaWebOrderByToken(orderId, token)
  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  if (order.paymentProofUploadedAt) {
    throw new Error('Este pedido ya tiene comprobante cargado')
  }

  const deadline = new Date(order.paymentProofDeadline).getTime()
  if (Date.now() > deadline) {
    throw new Error('El tiempo para subir el comprobante ha expirado')
  }

  const { error } = await supabaseAdmin
    .from('sales')
    .update({
      payment_proof_url: proofUrl,
      payment_proof_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('checkout_token', token)
    .eq('order_source', 'web')

  if (error) {
    throw new Error('No se pudo guardar el comprobante')
  }

  const updated = await getTiendaWebOrderByToken(orderId, token)
  if (!updated) {
    throw new Error('Pedido no encontrado')
  }

  return updated
}

export async function confirmTiendaWebOrder(orderId: string, userId: string): Promise<void> {
  const { data: sale, error } = await supabaseAdmin
    .from('sales')
    .select('id, status, order_source, store_id, sale_items(product_id, product_name, product_reference_code, quantity, unit_price, total)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !sale) {
    throw new Error('Pedido no encontrado')
  }

  if (sale.order_source !== 'web' || sale.status !== 'pending') {
    throw new Error('Este pedido no se puede confirmar')
  }

  const items = (sale.sale_items ?? []) as Array<{
    product_id: string
    product_name: string
    product_reference_code: string | null
    quantity: number
    unit_price: number
    total: number
  }>

  const { ProductsService } = await import('@/lib/products-service')
  const batchResult = await ProductsService.deductStockForSaleBatch(
    items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      productName: item.product_name,
      productReferenceCode: item.product_reference_code ?? undefined,
      unitPrice: item.unit_price,
      totalPrice: item.total
    })),
    userId,
    String(sale.store_id)
  )

  if (!batchResult.success) {
    throw new Error(
      `No hay stock suficiente para confirmar: ${batchResult.failedProductName ?? 'producto'}`
    )
  }

  const { error: saleUpdateError } = await supabaseAdmin
    .from('sales')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (saleUpdateError) {
    throw new Error('No se pudo completar el pedido')
  }

  await supabaseAdmin
    .from('payments')
    .update({
      paid_amount: items.reduce((s, i) => s + Number(i.total), 0),
      pending_amount: 0,
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('sale_id', orderId)
}
