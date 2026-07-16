import { supabase, supabaseAdmin } from './supabase'
import { Sale, SaleItem, SalePayment } from '@/types'
import { AuthService } from './auth-service'
import { ProductsService } from './products-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

/** Tamaño de página de la lista de ventas (contexto + servicio + tabla). */
export const SALES_PAGE_SIZE = 20

function mapWebOrderFields(row: Record<string, unknown>) {
  return {
    orderSource: row.order_source === 'web' ? ('web' as const) : ('pos' as const),
    customerPhone: row.customer_phone != null ? String(row.customer_phone) : null,
    customerEmail: row.customer_email != null ? String(row.customer_email) : null,
    customerAddress: row.customer_address != null ? String(row.customer_address) : null,
    customerNotes: row.customer_notes != null ? String(row.customer_notes) : null,
    paymentProofUrl: row.payment_proof_url != null ? String(row.payment_proof_url) : null,
    paymentProofDeadline:
      row.payment_proof_deadline != null ? String(row.payment_proof_deadline) : null,
    paymentProofUploadedAt:
      row.payment_proof_uploaded_at != null ? String(row.payment_proof_uploaded_at) : null
  }
}

export class SalesService {
  /**
   * Serial por tienda: PREFIX-##### (ej. ZT-00001).
   * Sin argumento usa la tienda del usuario; con `forStoreId` la tienda indicada (traslados/admin).
   * Las facturas legacy (#661) no se mezclan en la secuencia nueva.
   */
  static async getNextInvoiceNumber(forStoreId?: string): Promise<string> {
    const { formatStoreInvoiceNumber, deriveInvoicePrefix, normalizeInvoicePrefix } = await import(
      './invoice-number'
    )
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const useExplicit = typeof forStoreId === 'string' && forStoreId.length > 0
      const storeId = useExplicit ? forStoreId : getCurrentUserStoreId() || MAIN_STORE_ID
      const resolvedStoreId = storeId || MAIN_STORE_ID

      const { data: storeRow } = await supabaseAdmin
        .from('stores')
        .select('id, name, invoice_prefix')
        .eq('id', resolvedStoreId)
        .maybeSingle()

      const prefix = normalizeInvoicePrefix(
        storeRow?.invoice_prefix || deriveInvoicePrefix(storeRow?.name || 'ZT')
      )

      // Secuencia solo entre facturas nuevas del mismo prefijo en esa tienda.
      let salesQuery = supabaseAdmin
        .from('sales')
        .select('invoice_number')
        .ilike('invoice_number', `${prefix}-%`)

      if (resolvedStoreId === MAIN_STORE_ID) {
        salesQuery = salesQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        salesQuery = salesQuery.eq('store_id', resolvedStoreId)
      }

      const { data: rows, error } = await salesQuery.limit(5000)
      if (error) {
        return formatStoreInvoiceNumber(prefix, 1)
      }

      let maxSeq = 0
      for (const row of rows || []) {
        const inv = String(row.invoice_number || '')
        const m = inv.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))
        if (m) {
          const n = Number(m[1])
          if (Number.isFinite(n) && n > maxSeq) maxSeq = n
        }
      }

      return formatStoreInvoiceNumber(prefix, maxSeq + 1)
    } catch {
      return formatStoreInvoiceNumber('XX', 1)
    }
  }

  static async getAllSales(page: number = 1, limit: number = SALES_PAGE_SIZE): Promise<{ sales: Sale[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      // Obtener el total de ventas
      let countQuery = supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      if (!storeId || storeId === MAIN_STORE_ID) {
        countQuery = countQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        countQuery = countQuery.eq('store_id', storeId)
      }

      const { count, error: countError } = await countQuery

      // Si el count exacto falla (timeout en tablas grandes), seguimos con el listado
      if (countError) {
        console.warn('[Sales] Count falló, listando igual:', countError)
      }

      // Obtener las ventas paginadas con los códigos de referencia y pagos mixtos
      let dataQuery = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)

      if (!storeId || storeId === MAIN_STORE_ID) {
        dataQuery = dataQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        dataQuery = dataQuery.eq('store_id', storeId)
      }

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[Sales] Error listando ventas:', error)
        throw error
      }

      const totalCount = countError ? (offset + (data?.length || 0) + (data && data.length === limit ? 1 : 0)) : (count || 0)

      // OPTIMIZADO: Batch queries en lugar de N+1
      // 1. Recolectar product_ids que necesitan referencia
      const productIdsNeedingRef = new Set<string>()
      for (const sale of data || []) {
        for (const item of sale.sale_items || []) {
          if (!item.product_reference_code || item.product_reference_code === 'N/A' || item.product_reference_code === null) {
            productIdsNeedingRef.add(item.product_id)
          }
        }
      }

      // 2. Una sola query para obtener todas las referencias faltantes
      const productRefsMap = new Map<string, string>()
      if (productIdsNeedingRef.size > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, reference')
          .in('id', Array.from(productIdsNeedingRef))
        if (productsData) {
          for (const p of productsData) {
            productRefsMap.set(p.id, p.reference || 'N/A')
          }
        }
      }

      // 3. Recolectar invoice_numbers de ventas a crédito
      const creditInvoiceNumbers: string[] = []
      for (const sale of data || []) {
        if (sale.payment_method === 'credit' && sale.invoice_number) {
          creditInvoiceNumbers.push(sale.invoice_number)
        }
      }

      // 4. Una sola query para obtener todos los créditos
      const creditStatusMap = new Map<string, string>()
      if (creditInvoiceNumbers.length > 0) {
        let creditQuery = supabase
          .from('credits')
          .select('invoice_number, status')
          .in('invoice_number', creditInvoiceNumbers)
        if (!storeId || storeId === MAIN_STORE_ID) {
          creditQuery = creditQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        } else {
          creditQuery = creditQuery.eq('store_id', storeId)
        }
        const { data: creditsData } = await creditQuery
        if (creditsData) {
          for (const c of creditsData) {
            creditStatusMap.set(c.invoice_number, c.status)
          }
        }
      }

      // 5. Mapear ventas sin queries adicionales
      const sales = (data || []).map((sale) => {
        const itemsWithReferences = (sale.sale_items || []).map((item: any) => {
          let productReference = item.product_reference_code
          if (!productReference || productReference === 'N/A' || productReference === null) {
            productReference = productRefsMap.get(item.product_id) || 'N/A'
          }
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        })

        const creditStatus = sale.payment_method === 'credit' && sale.invoice_number
          ? creditStatusMap.get(sale.invoice_number) || null
          : null

        return {
          id: sale.id,
          clientId: sale.client_id,
          clientName: sale.client_name,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          discountType: sale.discount_type || 'amount',
          status: sale.status,
          paymentMethod: sale.payment_method,
          payments: sale.sale_payments?.map((payment: any) => ({
            id: payment.id,
            saleId: payment.sale_id,
            paymentType: payment.payment_type,
            amount: payment.amount,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at || payment.created_at
          })) || [],
          invoiceNumber: sale.invoice_number,
          sellerId: sale.seller_id,
          sellerName: sale.seller_name,
          sellerEmail: sale.seller_email,
          storeId: sale.store_id || undefined,
          createdAt: sale.created_at,
          items: itemsWithReferences,
          creditStatus: creditStatus,
          cancellationReason: sale.cancellation_reason || undefined,
          ...mapWebOrderFields(sale as Record<string, unknown>)
        }
      })

      return {
        sales,
        total: totalCount,
        hasMore: (offset + limit) < totalCount
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Método optimizado para dashboard con filtrado por fecha
  static async getDashboardSales(startDate?: Date, endDate?: Date): Promise<Sale[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      // Construir query base
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo ventas de esa microtienda
        query = query.eq('store_id', storeId)
      }

      query = query.order('created_at', { ascending: false })

      // Aplicar filtros de fecha si existen
      if (startDate) {
        // Usar inicio del día en hora local (sin conversión UTC)
        const startLocal = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0, 0, 0, 0
        )
        query = query.gte('created_at', startLocal.toISOString())
      }
      if (endDate) {
        // Usar final del día en hora local (sin conversión UTC)
        const endLocal = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23, 59, 59, 999
        )
        query = query.lte('created_at', endLocal.toISOString())
      }

      // Ejecutar query - Supabase tiene límite de 1,000 registros por query
      // Necesitamos hacer paginado para obtener todos los registros
      let allSales: any[] = []
      let offset = 0
      const limit = 1000 // Límite real de Supabase
      let hasMore = true

      while (hasMore) {
        const user = getCurrentUser()
        const storeId = getCurrentUserStoreId()

        let paginatedQuery = supabase
          .from('sales')
          .select(`
            *,
            sale_items (
              id,
              product_id,
              product_name,
              product_reference_code,
              quantity,
              unit_price,
              discount,
              total
            ),
            sale_payments (
              id,
              sale_id,
              payment_type,
              amount,
              created_at
            )
          `)

        // Filtrar por store_id:
        // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
        if (!storeId || storeId === MAIN_STORE_ID) {
          // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
          paginatedQuery = paginatedQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        } else {
          // Microtienda: solo ventas de esa microtienda
          paginatedQuery = paginatedQuery.eq('store_id', storeId)
        }

        paginatedQuery = paginatedQuery.order('created_at', { ascending: false })
          .range(offset, offset + limit - 1) // Lotes de 1,000

        // Aplicar filtros de fecha si existen
        if (startDate) {
          // Usar inicio del día en hora local (sin conversión UTC)
          const startLocal = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            0, 0, 0, 0
          )
          paginatedQuery = paginatedQuery.gte('created_at', startLocal.toISOString())
        }
        if (endDate) {
          // Usar final del día en hora local (sin conversión UTC)
          const endLocal = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23, 59, 59, 999
          )
          paginatedQuery = paginatedQuery.lte('created_at', endLocal.toISOString())
        }

        const { data, error } = await paginatedQuery

        if (error) {
          // Error silencioso en producción
          console.error('Error en paginado de ventas:', error)
          break
        }

        if (data && data.length > 0) {
          allSales = [...allSales, ...data]
          offset += data.length
          // Si recibimos menos de 1,000, significa que no hay más datos
          hasMore = data.length === limit
        } else {
          hasMore = false
        }
      }

      // OPTIMIZADO: Batch query para todas las referencias faltantes
      const productIdsNeedingRef = new Set<string>()
      for (const sale of allSales) {
        for (const item of sale.sale_items || []) {
          if (!item.product_reference_code || item.product_reference_code === 'N/A' || item.product_reference_code === null) {
            productIdsNeedingRef.add(item.product_id)
          }
        }
      }

      const productRefsMap = new Map<string, string>()
      if (productIdsNeedingRef.size > 0) {
        const idsArray = Array.from(productIdsNeedingRef)
        const BATCH_SIZE = 100
        for (let i = 0; i < idsArray.length; i += BATCH_SIZE) {
          const batch = idsArray.slice(i, i + BATCH_SIZE)
          const { data: productsData } = await supabase
            .from('products')
            .select('id, reference')
            .in('id', batch)
          if (productsData) {
            for (const p of productsData) {
              productRefsMap.set(p.id, p.reference || 'N/A')
            }
          }
        }
      }

      const sales = allSales.map((sale) => {
        const itemsWithReferences = (sale.sale_items || []).map((item: any) => {
          let productReference = item.product_reference_code
          if (!productReference || productReference === 'N/A' || productReference === null) {
            productReference = productRefsMap.get(item.product_id) || 'N/A'
          }
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        })

        return {
          id: sale.id,
          clientId: sale.client_id,
          clientName: sale.client_name,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          discountType: sale.discount_type || 'amount',
          status: sale.status,
          paymentMethod: sale.payment_method,
          payments: sale.sale_payments?.map((payment: any) => ({
            id: payment.id,
            saleId: payment.sale_id,
            paymentType: payment.payment_type,
            amount: payment.amount,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at || payment.created_at
          })) || [],
          invoiceNumber: sale.invoice_number,
          sellerId: sale.seller_id,
          sellerName: sale.seller_name,
          sellerEmail: sale.seller_email,
          storeId: sale.store_id || undefined,
          createdAt: sale.created_at,
          items: itemsWithReferences,
          cancellationReason: sale.cancellation_reason || undefined
        }
      })

      return sales
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async getSaleById(id: string): Promise<Sale | null> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)
        .eq('id', id)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.single()

      if (error) {
        // Error silencioso en producción
        throw error
      }

      if (!data) return null

      // OPTIMIZADO: Batch query para referencias faltantes
      const productIdsNeedingRef: string[] = []
      for (const item of data.sale_items || []) {
        if (!item.product_reference_code || item.product_reference_code === 'N/A' || item.product_reference_code === null) {
          productIdsNeedingRef.push(item.product_id)
        }
      }

      const productRefsMap = new Map<string, string>()
      if (productIdsNeedingRef.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, reference')
          .in('id', productIdsNeedingRef)
        if (productsData) {
          for (const p of productsData) {
            productRefsMap.set(p.id, p.reference || 'N/A')
          }
        }
      }

      const itemsWithReferences = (data.sale_items || []).map((item: any) => {
        let productReference = item.product_reference_code
        if (!productReference || productReference === 'N/A' || productReference === null) {
          productReference = productRefsMap.get(item.product_id) || 'N/A'
        }
        return {
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productReferenceCode: productReference,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          discountType: item.discount_type || 'amount',
          tax: item.tax || 0,
          total: item.total
        }
      })

      const result = {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        total: data.total,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        discountType: data.discount_type || 'amount',
        cancellationReason: data.cancellation_reason || undefined,
        status: data.status,
        paymentMethod: data.payment_method,
        payments: data.sale_payments?.map((payment: any) => ({
          id: payment.id,
          saleId: payment.sale_id,
          paymentType: payment.payment_type,
          amount: payment.amount,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at || payment.created_at
        })) || [],
        invoiceNumber: data.invoice_number,
        sellerId: data.seller_id,
        sellerName: data.seller_name,
        sellerEmail: data.seller_email,
        storeId: data.store_id || undefined,
        createdAt: data.created_at,
        items: itemsWithReferences,
        ...mapWebOrderFields(data as Record<string, unknown>)
      }

      return result
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>, currentUserId: string): Promise<Sale> {
    try {
      // Generar número de factura secuencial
      const invoiceNumber = await this.getNextInvoiceNumber()

      // Obtener información del usuario actual
      const currentUser = await AuthService.getCurrentUser()

      // Obtener store_id del usuario actual
      const storeId = getCurrentUserStoreId()

      // Crear la venta
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          invoice_number: invoiceNumber,
          seller_id: currentUser?.id || currentUserId,
          seller_name: currentUser?.name || 'Usuario',
          seller_email: currentUser?.email || '',
          store_id: storeId || '00000000-0000-0000-0000-000000000001' // Tienda principal por defecto
        })
        .select()
        .single()

      if (saleError) {
        // Error silencioso en producción
        throw saleError
      }

      // Crear los items de la venta y descontar stock (solo si no es borrador)
      let itemsWithStockInfo: Array<any> = []
      let insertedItems: Array<{ id: string; product_id: string; product_name: string; product_reference_code: string | null; quantity: number; unit_price: number; discount: number; total: number }> = []
      if (saleData.items && saleData.items.length > 0) {
        if (saleData.status !== 'draft') {
          const batchResult = await ProductsService.deductStockForSaleBatch(
            saleData.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              productName: item.productName,
              productReferenceCode: item.productReferenceCode,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            })),
            currentUserId
          )
          if (!batchResult.success || !batchResult.itemsWithStockInfo) {
            await supabase.from('sales').delete().eq('id', sale.id)
            throw new Error(`No hay suficiente stock para el producto: ${batchResult.failedProductName ?? 'desconocido'}`)
          }
          itemsWithStockInfo = batchResult.itemsWithStockInfo
        } else {
          itemsWithStockInfo = saleData.items.map((item) => ({
            productName: item.productName,
            productReference: item.productReferenceCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }))
        }

        const saleItems = saleData.items.map((item) => ({
          sale_id: sale.id,
          product_id: item.productId,
          product_name: item.productName,
          product_reference_code: item.productReferenceCode || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          total: item.total
        }))

        const { data: insertedItemsData, error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)
          .select('id, product_id, product_name, product_reference_code, quantity, unit_price, discount, total')

        if (itemsError) throw itemsError
        insertedItems = insertedItemsData ?? []
      }

      // Crear registros de pago según el método (solo si NO es borrador)
      if (saleData.status !== 'draft') {
        if (saleData.paymentMethod === 'mixed' && saleData.payments && saleData.payments.length > 0) {
          // Crear pagos mixtos
          const paymentRecords = saleData.payments.map(payment => ({
            sale_id: sale.id,
            payment_type: payment.paymentType,
            amount: payment.amount
          }))

          const { error: paymentsError } = await supabase
            .from('sale_payments')
            .insert(paymentRecords)

          if (paymentsError) {
            // Error silencioso en producción
            throw paymentsError
          }
        } else if (saleData.paymentMethod === 'credit') {
          // Crear crédito para ventas a crédito
          const { CreditsService } = await import('./credits-service')

          await CreditsService.createCredit({
            saleId: sale.id,
            clientId: saleData.clientId,
            clientName: saleData.clientName,
            invoiceNumber: invoiceNumber,
            totalAmount: saleData.total,
            paidAmount: 0,
            pendingAmount: saleData.total,
            status: 'pending',
            dueDate: saleData.dueDate || null,
            lastPaymentAmount: null,
            lastPaymentDate: null,
            lastPaymentUser: null,
            createdBy: currentUserId,
            createdByName: currentUser?.name || 'Usuario'
          })
        } else {
          // Crear pago único para métodos no mixtos (cash, transfer, etc.)
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              client_id: saleData.clientId,
              client_name: saleData.clientName,
              invoice_number: invoiceNumber,
              total_amount: saleData.total,
              paid_amount: saleData.paymentMethod === 'cash' ? saleData.total : 0,
              pending_amount: saleData.paymentMethod === 'cash' ? 0 : saleData.total,
              status: saleData.paymentMethod === 'cash' ? 'completed' : 'pending'
            })

          if (paymentError) {
            // Error silencioso en producción
            throw paymentError
          }
        }
      }

      // Log de actividad
      const paymentMethodLabel = saleData.paymentMethod === 'credit' ? 'Venta a Crédito' :
        saleData.paymentMethod === 'cash' ? 'Venta en Efectivo' :
          saleData.paymentMethod === 'transfer' ? 'Venta por Transferencia' :
            saleData.paymentMethod === 'mixed' ? 'Venta Mixta' : 'Venta'

      // Usar acción diferente según el tipo de venta
      const logAction = saleData.status === 'draft'
        ? 'sale_draft_create'
        : saleData.paymentMethod === 'credit'
          ? 'credit_sale_create'
          : 'sale_create'

      const logDescription = saleData.status === 'draft'
        ? `Borrador de ${paymentMethodLabel}: ${saleData.clientName} - Total: $${saleData.total.toLocaleString()}`
        : `${paymentMethodLabel}: ${saleData.clientName} - Total: $${saleData.total.toLocaleString()}`

      // Obtener la fecha de vencimiento del crédito si existe
      let creditDueDate = null
      if (saleData.paymentMethod === 'credit') {
        // Intentar obtener la fecha de saleData (puede no estar en el tipo pero se pasa desde el modal)
        const saleDataWithDueDate = saleData as any
        if (saleDataWithDueDate.dueDate) {
          creditDueDate = saleDataWithDueDate.dueDate
        } else {
          // Si no, obtenerla del crédito recién creado
          try {
            const { CreditsService } = await import('./credits-service')
            const credit = await CreditsService.getCreditByInvoiceNumber(invoiceNumber)
            if (credit && credit.dueDate) {
              creditDueDate = credit.dueDate
            }
          } catch (error) {
            // Error silencioso
          }
        }
      }

      await AuthService.logActivity(
        currentUserId,
        logAction,
        'sales',
        {
          description: logDescription,
          saleId: sale.id,
          invoiceNumber: invoiceNumber,
          clientName: saleData.clientName,
          total: saleData.total,
          paymentMethod: saleData.paymentMethod,
          status: saleData.status,
          itemsCount: itemsWithStockInfo.length,
          items: itemsWithStockInfo,
          dueDate: creditDueDate
        }
      )

      const now = new Date().toISOString()
      const completeSale: Sale = {
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: (sale as any).discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        storeId: sale.store_id ?? undefined,
        createdAt: sale.created_at,
        items: insertedItems.map((row) => ({
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          productReferenceCode: row.product_reference_code ?? undefined,
          quantity: row.quantity,
          unitPrice: row.unit_price,
          discount: row.discount ?? 0,
          total: row.total
        })),
        payments: saleData.paymentMethod === 'mixed' && saleData.payments?.length
          ? saleData.payments.map((p, i) => ({
              id: `temp-${sale.id}-${i}`,
              saleId: sale.id,
              paymentType: p.paymentType,
              amount: p.amount,
              createdAt: now,
              updatedAt: now
            }))
          : undefined
      }
      return completeSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async updateSale(id: string, saleData: Partial<Sale>, currentUserId: string): Promise<Sale> {
    try {
      // Validar que solo se puedan actualizar ventas en estado draft
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Venta no encontrada')
      }

      // Verificar que la venta pertenece a la tienda del usuario (si no es admin principal)
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && existingSale.storeId !== storeId) {
        throw new Error('No tienes permiso para editar esta venta')
      }

      if (existingSale.status !== 'draft') {
        throw new Error('Solo se pueden editar ventas en estado borrador')
      }

      // Actualizar la venta
      const { data, error } = await supabase
        .from('sales')
        .update({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        // Error silencioso en producción
        throw error
      }

      // Si hay items en saleData, actualizar los items de la venta
      if (saleData.items && saleData.items.length > 0) {
        // Eliminar items antiguos
        const { error: deleteError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', id)

        if (deleteError) {
          // Error silencioso en producción
          throw deleteError
        }

        // Crear nuevos items
        const saleItems = saleData.items.map(item => ({
          sale_id: id,
          product_id: item.productId,
          product_name: item.productName,
          product_reference_code: item.productReferenceCode || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          total: item.total
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)

        if (itemsError) {
          // Error silencioso en producción
          throw itemsError
        }
      }

      // Obtener la venta actualizada con los items
      const updatedSale = await this.getSaleById(id)
      if (!updatedSale) {
        throw new Error('Error al obtener la venta actualizada')
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_update',
        'sales',
        {
          description: `Borrador actualizado: ${saleData.clientName || 'Venta'} - Total: $${saleData.total?.toLocaleString() || 'N/A'}`,
          saleId: id,
          changes: Object.keys(saleData).join(', ')
        }
      )

      return updatedSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Finalizar un borrador: descuenta stock y crea crédito si corresponde
  static async finalizeDraftSale(id: string, currentUserId: string): Promise<Sale> {
    try {
      // Obtener la venta borrador
      const draftSale = await this.getSaleById(id)

      if (!draftSale) {
        throw new Error('Venta no encontrada')
      }

      if (draftSale.status !== 'draft') {
        throw new Error('Esta venta no es un borrador')
      }

      // Obtener información del usuario actual
      const currentUser = await AuthService.getCurrentUser()

      // Descontar stock de todos los productos
      if (draftSale.items && draftSale.items.length > 0) {
        for (const item of draftSale.items) {
          // Verificar stock disponible antes de descontar
          const product = await ProductsService.getProductById(item.productId)
          if (!product) {
            throw new Error(`Producto no encontrado: ${item.productName}`)
          }

          const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
          if (totalStock < item.quantity) {
            throw new Error(`No hay suficiente stock para el producto "${item.productName}". Stock disponible: ${totalStock}, Cantidad requerida: ${item.quantity}`)
          }

          const stockResult = await ProductsService.deductStockForSale(
            item.productId,
            item.quantity,
            currentUserId
          )

          if (!stockResult.success) {
            throw new Error(`No hay suficiente stock para el producto "${item.productName}". Stock disponible: ${totalStock}, Cantidad requerida: ${item.quantity}`)
          }
        }
      }

      // Crear crédito si el método de pago es crédito
      if (draftSale.paymentMethod === 'credit') {
        const { CreditsService } = await import('./credits-service')

        // Intentar obtener la fecha de vencimiento del log de creación del borrador
        let creditDueDate = null
        try {
          const { data: logs } = await supabase
            .from('logs')
            .select('details')
            .eq('module', 'sales')
            .eq('action', 'sale_draft_create')
            .order('created_at', { ascending: false })
            .limit(100)

          // Buscar el log que corresponde a este borrador
          if (logs && logs.length > 0) {
            for (const log of logs) {
              let details = log.details
              if (typeof details === 'string') {
                try {
                  details = JSON.parse(details)
                } catch {
                  continue
                }
              }
              if (details && typeof details === 'object' && details.saleId === draftSale.id && details.dueDate) {
                creditDueDate = details.dueDate
                break
              }
            }
          }
        } catch (error) {
          // Error silencioso - usar null si no se encuentra
        }

        await CreditsService.createCredit({
          saleId: draftSale.id,
          clientId: draftSale.clientId,
          clientName: draftSale.clientName,
          invoiceNumber: draftSale.invoiceNumber || '',
          totalAmount: draftSale.total,
          paidAmount: 0,
          pendingAmount: draftSale.total,
          status: 'pending',
          dueDate: creditDueDate,
          lastPaymentAmount: null,
          lastPaymentDate: null,
          lastPaymentUser: null,
          createdBy: currentUserId,
          createdByName: currentUser?.name || 'Usuario'
        })
      }

      // Actualizar el status a 'completed'
      const updatedSale = await this.updateSale(id, { status: 'completed' }, currentUserId)

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_draft_finalize',
        'sales',
        {
          description: `Borrador facturado: ${draftSale.clientName} - Total: $${draftSale.total.toLocaleString()}`,
          saleId: id,
          clientName: draftSale.clientName,
          total: draftSale.total,
          paymentMethod: draftSale.paymentMethod
        }
      )

      return updatedSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async deleteSale(id: string, currentUserId: string): Promise<void> {
    try {
      // Verificar que la venta pertenece a la tienda del usuario (si no es admin principal)
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Venta no encontrada')
      }

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && existingSale.storeId !== storeId) {
        throw new Error('No tienes permiso para eliminar esta venta')
      }

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) {
        // Error silencioso en producción
        throw error
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_delete',
        'sales',
        {
          description: `Venta eliminada: ID ${id}`,
          saleId: id
        }
      )
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async cancelSale(id: string, reason: string, currentUserId: string): Promise<{ success: boolean, totalRefund?: number }> {
    try {
      // Obtener la venta para verificar si tiene crédito
      const sale = await this.getSaleById(id)
      if (!sale) {
        throw new Error('Venta no encontrada')
      }

      let totalRefund = 0
      let credit = null
      let cancellingUserName = 'Usuario'

      try {
        const user = await AuthService.getCurrentUser()
        if (user?.name) cancellingUserName = user.name
      } catch {
        // nombre por defecto
      }

      if (sale.paymentMethod === 'credit') {
        const { CreditsService } = await import('./credits-service')
        credit = await CreditsService.resolveCreditForSale({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
        })

        if (credit) {
          totalRefund = await CreditsService.cancelActivePaymentRecordsForCredit(
            credit.id,
            `Cancelación de factura: ${sale.invoiceNumber} - ${reason}`,
            currentUserId,
            cancellingUserName
          )
        }
      } else if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
        // Para ventas en efectivo o transferencia, el reembolso es el total de la venta
        totalRefund = sale.total
      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
        // Para pagos mixtos, calcular el reembolso basado en los pagos directos (efectivo/transferencia)
        totalRefund = sale.payments
          .filter(payment => payment.paymentType === 'cash' || payment.paymentType === 'transfer')
          .reduce((sum, payment) => sum + payment.amount, 0)
      }

      // Preparar items para devolución de stock
      const stockReturnItems = sale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName
      }))

      // Devolver stock a la tienda que hizo la venta (microtienda o principal)
      const stockReturnResult = await ProductsService.returnStockFromSaleBatch(stockReturnItems, currentUserId, sale.storeId ?? null)

      // Capturar información del stock devuelto para el log
      let stockReturnInfo = null
      if (stockReturnResult.success && stockReturnResult.results.length > 0) {
        stockReturnInfo = {
          successfulUpdates: stockReturnResult.results.filter(r => r.success).map(r => ({
            productId: r.productId,
            productName: r.productName || sale.items.find(i => i.productId === r.productId)?.productName || 'N/A',
            productReference: r.productReference || sale.items.find(i => i.productId === r.productId)?.productReferenceCode || 'N/A',
            quantityReturned: r.quantity || 0,
            previousStoreStock: r.previousStock || 0,
            newStoreStock: r.newStock || 0
          }))
        }
      }

      if (!stockReturnResult.success) {
        const failedReturns = stockReturnResult.results.filter(r => !r.success)
        // Continuar con la anulación aunque algunos productos no se pudieron devolver
      }

      // Anular la venta
      const { error: saleCancelError } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (saleCancelError) {
        throw saleCancelError
      }

      // Si es una venta a crédito, actualizar el crédito tras anular la factura
      if (sale.paymentMethod === 'credit') {
        const { CreditsService } = await import('./credits-service')
        const cancellationReason = `Cancelación de factura: ${sale.invoiceNumber}`

        if (!credit) {
          credit = await CreditsService.resolveCreditForSale({
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
          })
        }

        if (credit) {
          await this.updateCreditStatusAfterSaleCancellation(
            credit.id,
            sale.id,
            currentUserId,
            cancellingUserName,
            cancellationReason
          )
        } else {
          await CreditsService.markCreditCancelledForSaleIfExists(sale.id, {
            reason: `${cancellationReason} - ${reason}`,
            userId: currentUserId,
            userName: cancellingUserName,
          })
        }
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_cancel',
        'sales',
        {
          description: sale.paymentMethod === 'credit'
            ? `Factura perteneciente a un crédito cancelada: ${sale.invoiceNumber} - Motivo: ${reason}${totalRefund > 0 ? ` - Reembolso: $${totalRefund.toLocaleString()}` : ''}`
            : `Venta cancelada: ID ${id} - Motivo: ${reason}${totalRefund > 0 ? ` - Reembolso: $${totalRefund.toLocaleString()}` : ''}`,
          saleId: id,
          invoiceNumber: sale.invoiceNumber,
          reason: reason,
          totalRefund: totalRefund,
          isCreditSale: sale.paymentMethod === 'credit',
          creditId: credit?.id || null,
          clientName: sale.clientName || null,
          stockReturnInfo: stockReturnInfo
        }
      )

      return { success: true, totalRefund }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  /**
   * Tras anular una venta a crédito: cierra ese crédito (relación 1:1 por sale_id).
   *
   * Importante: no sumar otras ventas con el mismo invoice_number de otras tiendas.
   * Cada microtienda reutiliza #001, #002…; mezclarlas deja saldos fantasma.
   */
  static async updateCreditStatusAfterSaleCancellation(
    creditId: string,
    cancelledSaleId: string,
    cancellingUserId: string,
    cancellingUserName = 'Usuario',
    cancellationReason?: string
  ): Promise<void> {
    try {
      const { CreditsService } = await import('./credits-service')

      const cancelledSale = await this.getSaleById(cancelledSaleId)
      if (!cancelledSale) {
        return
      }

      const reason =
        cancellationReason ||
        `Cancelación de factura: ${cancelledSale.invoiceNumber}`

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const storeId = cancelledSale.storeId || MAIN_STORE_ID

      const { data: creditBeforeUpdate } = await supabaseAdmin
        .from('credits')
        .select('*')
        .eq('id', creditId)
        .maybeSingle()

      if (!creditBeforeUpdate) {
        return
      }

      // Caso normal: el crédito pertenece a esta venta → anular siempre.
      if (
        !creditBeforeUpdate.sale_id ||
        creditBeforeUpdate.sale_id === cancelledSaleId
      ) {
        await CreditsService.markCreditAsCancelled(creditId, {
          reason,
          userId: cancellingUserId,
          userName: cancellingUserName,
        })

        if (cancellingUserId) {
          try {
            await AuthService.logActivity(cancellingUserId, 'credit_cancelled', 'credits', {
              description: `Crédito cancelado: ${creditBeforeUpdate.client_name} - Factura: ${creditBeforeUpdate.invoice_number} - Motivo: Cancelación de factura asociada`,
              creditId,
              invoiceNumber: creditBeforeUpdate.invoice_number,
              clientName: creditBeforeUpdate.client_name,
              totalAmount: creditBeforeUpdate.total_amount,
              paidAmount: creditBeforeUpdate.paid_amount || 0,
              reason: 'Cancelación de factura asociada',
              cancelledSaleId,
            })
          } catch {
            // log opcional
          }
        }
        return
      }

      // Fallback legacy: solo ventas de la MISMA tienda con el mismo número de factura.
      let salesQuery = supabaseAdmin
        .from('sales')
        .select('id, status, total, store_id')
        .eq('invoice_number', cancelledSale.invoiceNumber)
        .order('created_at', { ascending: true })

      if (storeId === MAIN_STORE_ID) {
        salesQuery = salesQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        salesQuery = salesQuery.eq('store_id', storeId)
      }

      const { data: allSales, error: salesError } = await salesQuery

      if (salesError || !allSales?.length) {
        await CreditsService.markCreditAsCancelled(creditId, {
          reason,
          userId: cancellingUserId,
          userName: cancellingUserName,
        })
        return
      }

      const activeSales = allSales.filter((sale) => sale.status !== 'cancelled')

      if (activeSales.length === 0) {
        await CreditsService.markCreditAsCancelled(creditId, {
          reason,
          userId: cancellingUserId,
          userName: cancellingUserName,
        })

        if (cancellingUserId) {
          try {
            await AuthService.logActivity(cancellingUserId, 'credit_cancelled', 'credits', {
              description: `Crédito cancelado: ${creditBeforeUpdate.client_name} - Factura: ${creditBeforeUpdate.invoice_number} - Motivo: Cancelación de factura asociada`,
              creditId,
              invoiceNumber: creditBeforeUpdate.invoice_number,
              clientName: creditBeforeUpdate.client_name,
              totalAmount: creditBeforeUpdate.total_amount,
              paidAmount: creditBeforeUpdate.paid_amount || 0,
              reason: 'Cancelación de factura asociada',
              cancelledSaleId,
            })
          } catch {
            // log opcional
          }
        }
        return
      }

      const totalAmount = activeSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
      const paidAmount = creditBeforeUpdate.paid_amount || 0
      const pendingAmount = Math.max(0, totalAmount - paidAmount)

      let newStatus = 'pending'
      if (pendingAmount <= 0) {
        newStatus = 'completed'
      } else if (paidAmount > 0) {
        newStatus = 'partial'
      }

      const { error: updateError } = await supabaseAdmin
        .from('credits')
        .update({
          total_amount: totalAmount,
          pending_amount: pendingAmount,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditId)

      if (updateError) {
        throw updateError
      }
    } catch (error) {
      throw error
    }
  }

  static async searchSalesForWarranty(searchTerm: string): Promise<Sale[]> {
    try {
      // Limpiar el término de búsqueda
      const cleanTerm = searchTerm.trim()
      if (!cleanTerm) return []

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()

      // Construir la consulta de búsqueda (SIN excluir ventas canceladas para garantías)
      let searchQuery = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          )
        `)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        searchQuery = searchQuery.eq('store_id', storeId)
      }

      // Lógica de búsqueda mejorada
      let searchConditions: string[] = []

      // Si el término es un número, priorizar búsqueda por número de factura
      if (!isNaN(Number(cleanTerm))) {
        const numericValue = Number(cleanTerm)

        // Buscar por número de factura exacto (sin el #)
        searchConditions.push(`invoice_number.eq.#${cleanTerm.padStart(3, '0')}`)

        // Buscar por número de factura que contenga el número (legacy y PREFIX-#####)
        searchConditions.push(`invoice_number.ilike.%${cleanTerm}%`)
        searchConditions.push(`invoice_number.ilike.%-${cleanTerm.padStart(5, '0')}`)
        searchConditions.push(`invoice_number.ilike.%-${cleanTerm}`)

        // Buscar por monto exacto
        searchConditions.push(`total.eq.${numericValue}`)
        searchConditions.push(`subtotal.eq.${numericValue}`)

        // Buscar en otros campos que puedan contener el número
        searchConditions.push(`client_name.ilike.%${cleanTerm}%`)
        searchConditions.push(`seller_name.ilike.%${cleanTerm}%`)
      } else {
        // Para términos no numéricos, buscar en campos de texto
        searchConditions = [
          `client_name.ilike.%${cleanTerm}%`,
          `invoice_number.ilike.%${cleanTerm}%`,
          `payment_method.ilike.%${cleanTerm}%`,
          `seller_name.ilike.%${cleanTerm}%`,
          `seller_email.ilike.%${cleanTerm}%`
        ]

        // Agregar búsqueda por métodos de pago en español
        const paymentMethodMappings = {
          'efectivo': 'cash',
          'contado': 'cash',
          'efectivo/contado': 'cash',
          'crédito': 'credit',
          'credito': 'credit',
          'transferencia': 'transfer',
          'garantía': 'warranty',
          'garantia': 'warranty',
          'mixto': 'mixed'
        }

        // Si el término coincide con un método de pago en español, buscar por el valor en inglés
        const lowerTerm = cleanTerm.toLowerCase()
        if (paymentMethodMappings[lowerTerm]) {
          searchConditions.push(`payment_method.eq.${paymentMethodMappings[lowerTerm]}`)
        }
      }

      const { data, error } = await searchQuery
        .or(searchConditions.join(','))
        // NO excluir ventas canceladas para garantías
        .order('created_at', { ascending: false })

      if (error) {
        // Error silencioso en producción
        throw error
      }

      // Filtrar y ordenar resultados para priorizar coincidencias exactas
      const results = data?.map(sale => ({
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: sale.discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        createdAt: sale.created_at,
        items: sale.sale_items?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productReferenceCode: item.product_reference_code || 'N/A',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          discountType: item.discount_type || 'amount',
          tax: item.tax || 0,
          total: item.total
        })) || []
      })) || []

      // Si el término es numérico, priorizar resultados que coincidan con el número de factura
      if (!isNaN(Number(cleanTerm))) {
        return results.sort((a, b) => {
          // Priorizar coincidencias exactas en el número de factura
          const aExactMatch = a.invoiceNumber === `#${cleanTerm.padStart(3, '0')}` ? 3 : 0
          const bExactMatch = b.invoiceNumber === `#${cleanTerm.padStart(3, '0')}` ? 3 : 0

          // Luego coincidencias parciales en el número de factura
          const aPartialMatch = a.invoiceNumber?.includes(cleanTerm) ? 2 : 0
          const bPartialMatch = b.invoiceNumber?.includes(cleanTerm) ? 2 : 0

          // Finalmente coincidencias en otros campos
          const aOtherMatch = (a.clientName?.includes(cleanTerm) || a.sellerName?.includes(cleanTerm)) ? 1 : 0
          const bOtherMatch = (b.clientName?.includes(cleanTerm) || b.sellerName?.includes(cleanTerm)) ? 1 : 0

          const aScore = aExactMatch + aPartialMatch + aOtherMatch
          const bScore = bExactMatch + bPartialMatch + bOtherMatch

          return bScore - aScore
        })
      }

      return results
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async searchSales(searchTerm: string): Promise<Sale[]> {
    try {
      const cleanTerm = searchTerm.trim()
      if (!cleanTerm) return []

      // Detectar si es un número (para buscar por ID de factura)
      const numericValue = cleanTerm.replace('#', '')
      const isNumber = !isNaN(Number(numericValue)) && numericValue.length > 0

      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          )
        `)

      // Misma regla que el listado: siempre acotar a la tienda activa
      // (aunque sea admin), sin mezclar facturas de otras microtiendas.
      if (isMainStore) {
        const storeScope = `or(store_id.is.null,store_id.eq.${MAIN_STORE_ID})`
        if (isNumber) {
          const invoiceExact = `#${numericValue.padStart(3, '0')}`
          const padded5 = numericValue.padStart(5, '0')
          query = query.or(
            [
              `and(${storeScope},invoice_number.eq.${invoiceExact})`,
              `and(${storeScope},invoice_number.ilike.%${numericValue}%)`,
              `and(${storeScope},invoice_number.ilike.%-${padded5})`,
              `and(${storeScope},invoice_number.ilike.%-${numericValue})`,
              `and(${storeScope},client_name.ilike.%${cleanTerm}%)`
            ].join(',')
          )
        } else {
          query = query
            .or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
            .ilike('client_name', `%${cleanTerm}%`)
        }
      } else {
        query = query.eq('store_id', storeId)
        if (isNumber) {
          const invoiceExact = `#${numericValue.padStart(3, '0')}`
          const padded5 = numericValue.padStart(5, '0')
          query = query.or(
            `invoice_number.eq.${invoiceExact},invoice_number.ilike.%${numericValue}%,invoice_number.ilike.%-${padded5},invoice_number.ilike.%-${numericValue},client_name.ilike.%${cleanTerm}%`
          )
        } else {
          query = query.or(
            `client_name.ilike.%${cleanTerm}%,invoice_number.ilike.%${cleanTerm}%`
          )
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        // Error silencioso en producción
        throw error
      }

      return await Promise.all(data?.map(async sale => {
        // Obtener items de la venta con referencia de productos
        const items = await Promise.all((sale.sale_items || []).map(async (item: any) => {
          let productReference = item.product_reference_code

          // Si no hay referencia guardada, obtenerla desde la tabla products (para ventas antiguas)
          if (!productReference || productReference === 'N/A' || productReference === null) {
            const { data: product } = await supabase
              .from('products')
              .select('reference')
              .eq('id', item.product_id)
              .single()

            productReference = product?.reference || 'N/A'
          }

          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        }))

        // Obtener pagos mixtos si existe
        let payments: SalePayment[] = []
        if (sale.payment_method === 'mixed') {
          const { data: paymentData } = await supabase
            .from('sale_payments')
            .select('id,sale_id,payment_type,amount,created_at')
            .eq('sale_id', sale.id)

          payments = (paymentData || []).map((p: any) => ({
            id: p.id,
            saleId: p.sale_id,
            paymentType: p.payment_type,
            amount: p.amount,
            createdAt: p.created_at,
            updatedAt: p.updated_at || p.created_at
          }))
        }

        // Obtener información del crédito si es una venta a crédito
        let creditStatus = null
        if (sale.payment_method === 'credit' && sale.invoice_number) {
          try {
            const { CreditsService } = await import('./credits-service')
            const credit = await CreditsService.getCreditByInvoiceNumber(sale.invoice_number)
            if (credit) {
              creditStatus = credit.status
            }
          } catch (error) {
            // Error silencioso - continuar sin información de crédito
          }
        }

        return {
          id: sale.id,
          clientId: sale.client_id,
          clientName: sale.client_name,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          discountType: sale.discount_type || 'amount',
          status: sale.status,
          paymentMethod: sale.payment_method,
          invoiceNumber: sale.invoice_number,
          sellerId: sale.seller_id,
          sellerName: sale.seller_name || '',
          sellerEmail: sale.seller_email || '',
          storeId: sale.store_id || undefined,
          createdAt: sale.created_at,
          items,
          payments: payments.length > 0 ? payments : undefined,
          creditStatus: creditStatus // Estado del crédito asociado
        }
      }) || [])
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Obtener todas las ventas de un producto específico
  static async getSalesByProductId(productId: string, startDate?: Date): Promise<Sale[]> {
    try {
      // Obtener los IDs de ventas que contienen este producto
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('sale_id')
        .eq('product_id', productId)

      if (itemsError) {
        console.error('Error obteniendo sale_items:', itemsError)
        return []
      }

      if (!saleItems || saleItems.length === 0) {
        return []
      }

      // Obtener los IDs de ventas únicos
      const saleIds = [...new Set(saleItems.map((item: any) => item.sale_id))]

      if (saleIds.length === 0) {
        return []
      }

      // Supabase tiene un límite en .in(), así que dividimos en lotes si es necesario
      const batchSize = 100
      const batches: string[][] = []
      for (let i = 0; i < saleIds.length; i += batchSize) {
        batches.push(saleIds.slice(i, i + batchSize))
      }

      // Obtener todas las ventas en lotes
      const allSalesData: any[] = []
      for (const batch of batches) {
        const storeId = getCurrentUserStoreId()

        let salesQuery = supabase
          .from('sales')
          .select(`
            *,
            sale_items (
              id,
              product_id,
              product_name,
              product_reference_code,
              quantity,
              unit_price,
              discount,
              discount_type,
              total
            ),
            sale_payments (
              id,
              sale_id,
              payment_type,
              amount,
              created_at
            )
          `)
          .in('id', batch)

        // Siempre filtrar por la tienda actual: análisis de rotación y márgenes es por tienda
        const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
        if (!storeId || storeId === MAIN_STORE_ID) {
          salesQuery = salesQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        } else {
          salesQuery = salesQuery.eq('store_id', storeId)
        }

        // Si hay una fecha de inicio, filtrar por fecha
        if (startDate) {
          salesQuery = salesQuery.gte('created_at', startDate.toISOString())
        }

        const { data: salesData, error: salesError } = await salesQuery
          .order('created_at', { ascending: false })

        if (salesError) {
          console.error('Error obteniendo ventas (batch):', salesError)
          continue // Continuar con el siguiente lote aunque este falle
        }

        if (salesData) {
          allSalesData.push(...salesData)
        }
      }

      if (allSalesData.length === 0) {
        return []
      }

      // Obtener todas las referencias de productos de una vez (optimización)
      const allProductIds = new Set<string>()
      allSalesData.forEach((sale: any) => {
        (sale.sale_items || []).forEach((item: any) => {
          if (item.product_id && (!item.product_reference_code || item.product_reference_code === 'N/A' || item.product_reference_code === null)) {
            allProductIds.add(item.product_id)
          }
        })
      })

      // Obtener todas las referencias de productos en una sola consulta
      const productReferencesMap = new Map<string, string>()
      if (allProductIds.size > 0) {
        const productIdsArray = Array.from(allProductIds)
        const batchSize = 100
        for (let i = 0; i < productIdsArray.length; i += batchSize) {
          const batch = productIdsArray.slice(i, i + batchSize)
          const { data: products } = await supabase
            .from('products')
            .select('id, reference')
            .in('id', batch)

          if (products) {
            products.forEach((product: any) => {
              productReferencesMap.set(product.id, product.reference || 'N/A')
            })
          }
        }
      }

      // Mapear las ventas al formato Sale
      const sales = allSalesData.map((sale: any) => {
        // Obtener referencias de productos del mapa
        const itemsWithReferences = (sale.sale_items || []).map((item: any) => {
          let productReference = item.product_reference_code

          if (!productReference || productReference === 'N/A' || productReference === null) {
            productReference = productReferencesMap.get(item.product_id) || 'N/A'
          }

          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        })

        return {
          id: sale.id,
          clientId: sale.client_id,
          clientName: sale.client_name,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          discountType: sale.discount_type || 'amount',
          status: sale.status,
          paymentMethod: sale.payment_method,
          invoiceNumber: sale.invoice_number,
          sellerId: sale.seller_id,
          sellerName: sale.seller_name || '',
          sellerEmail: sale.seller_email || '',
          storeId: sale.store_id || undefined,
          createdAt: sale.created_at,
          items: itemsWithReferences,
          payments: sale.sale_payments?.map((payment: any) => ({
            id: payment.id,
            saleId: payment.sale_id,
            paymentType: payment.payment_type,
            amount: payment.amount,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at || payment.created_at
          })) || []
        }
      })

      // Filtrar solo las ventas que tienen el producto
      const salesWithProduct = sales.filter(sale => {
        return sale.items?.some(item => item.productId === productId) || false
      }) as Sale[]

      return salesWithProduct
    } catch (error) {
      console.error('Error en getSalesByProductId:', error)
      return []
    }
  }

  // Método ultra-optimizado para obtener solo los totales del dashboard con soporte para grandes volúmenes
  static async getDashboardSummary(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number,
    cashRevenue: number,
    transferRevenue: number,
    salesCount: number
  }> {
    try {
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let cashRevenue = 0
      let transferRevenue = 0
      let salesCount = 0
      let hasMore = true
      let offset = 0
      const limit = 1000

      while (hasMore) {
        let query = supabase
          .from('sales')
          .select(`
            total,
            payment_method,
            status,
            sale_payments (
              payment_type,
              amount
            )
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'draft')
          .range(offset, offset + limit - 1)

        if (!storeId || storeId === MAIN_STORE_ID) {
          query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        } else {
          query = query.eq('store_id', storeId)
        }

        const { data, error } = await query

        if (error) throw error

        if (!data || data.length === 0) {
          hasMore = false
          break
        }

        salesCount += data.length

        data.forEach(sale => {
          if (sale.sale_payments && sale.sale_payments.length > 0) {
            sale.sale_payments.forEach((payment: any) => {
              if (payment.payment_type === 'cash') cashRevenue += payment.amount || 0
              if (payment.payment_type === 'transfer') transferRevenue += payment.amount || 0
            })
          } else {
            if (sale.payment_method === 'cash') cashRevenue += sale.total || 0
            if (sale.payment_method === 'transfer') transferRevenue += sale.total || 0
          }
        })

        if (data.length < limit) {
          hasMore = false
        } else {
          offset += limit
        }
      }

      return {
        totalRevenue: cashRevenue + transferRevenue,
        cashRevenue,
        transferRevenue,
        salesCount
      }
    } catch (error) {
      console.error('Error en getDashboardSummary:', error)
      return { totalRevenue: 0, cashRevenue: 0, transferRevenue: 0, salesCount: 0 }
    }
  }

  /**
   * Totales por tienda (solo ventas completadas). Para la tienda principal agrupa store_id NULL y MAIN_STORE_ID.
   * Pensado para la vista de Micro Tiendas (super admin).
   */
  static async getCompletedSalesSummaryByStore(): Promise<
    Record<string, { count: number; revenue: number }>
  > {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const map: Record<string, { count: number; revenue: number }> = {}
    const pageSize = 1000
    let from = 0

    try {
      for (;;) {
        const { data, error } = await supabase
          .from('sales')
          .select('store_id, total')
          .eq('status', 'completed')
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('getCompletedSalesSummaryByStore:', error)
          return map
        }
        if (!data?.length) break

        for (const row of data) {
          const key =
            !row.store_id || row.store_id === MAIN_STORE_ID
              ? MAIN_STORE_ID
              : row.store_id
          if (!map[key]) map[key] = { count: 0, revenue: 0 }
          map[key].count += 1
          map[key].revenue += Number(row.total) || 0
        }

        if (data.length < pageSize) break
        from += pageSize
      }
    } catch (e) {
      console.error('getCompletedSalesSummaryByStore:', e)
    }
    return map
  }

  /**
   * Ingresos del día (ventas completadas) por tienda, usando inicio/fin del día en hora local del cliente.
   * Misma convención de tienda principal (null + MAIN_STORE_ID) que getCompletedSalesSummaryByStore.
   */
  static async getTodayCompletedRevenueByStore(): Promise<Record<string, number>> {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const map: Record<string, number> = {}
    const now = new Date()
    const startLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    )
    const endLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    )
    const pageSize = 1000
    let from = 0

    try {
      for (;;) {
        const { data, error } = await supabase
          .from('sales')
          .select('store_id, total')
          .eq('status', 'completed')
          .gte('created_at', startLocal.toISOString())
          .lte('created_at', endLocal.toISOString())
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('getTodayCompletedRevenueByStore:', error)
          return map
        }
        if (!data?.length) break

        for (const row of data) {
          const key =
            !row.store_id || row.store_id === MAIN_STORE_ID
              ? MAIN_STORE_ID
              : row.store_id
          map[key] = (map[key] ?? 0) + (Number(row.total) || 0)
        }

        if (data.length < pageSize) break
        from += pageSize
      }
    } catch (e) {
      console.error('getTodayCompletedRevenueByStore:', e)
    }
    return map
  }

  /** Productos más vendidos (últimos N días) para rejilla POS. */
  static async getTopSoldProductIds(
    options: { limit?: number; lookbackDays?: number; maxSales?: number } = {}
  ): Promise<Array<{ productId: string; quantitySold: number }>> {
    const { limit = 48, lookbackDays = 90, maxSales = 2000 } = options
    const storeId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const since = new Date()
    since.setDate(since.getDate() - lookbackDays)

    try {
      let query = supabase
        .from('sales')
        .select('sale_items(product_id, quantity)')
        .neq('status', 'cancelled')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(maxSales)

      if (!storeId || storeId === MAIN_STORE_ID) {
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query
      if (error || !data?.length) return []

      const counts = new Map<string, number>()
      for (const sale of data) {
        for (const item of sale.sale_items || []) {
          const productId = item?.product_id as string | undefined
          if (!productId) continue
          counts.set(productId, (counts.get(productId) || 0) + (Number(item.quantity) || 0))
        }
      }

      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId, quantitySold]) => ({ productId, quantitySold }))
    } catch {
      return []
    }
  }
}
