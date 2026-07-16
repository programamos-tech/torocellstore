import { supabase, supabaseAdmin } from './supabase'
import { Credit, PaymentRecord } from '@/types'
import { AuthService } from './auth-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

type PaymentRecordRow = {
  id: string
  payment_id: string
  amount: number
  payment_date: string
  payment_method: string
  description?: string | null
  user_id: string
  user_name: string
  store_id?: string | null
  status?: string | null
  cancelled_at?: string | null
  cancelled_by?: string | null
  cancelled_by_name?: string | null
  cancellation_reason?: string | null
  created_at: string
  payments?: { sale_id: string } | { sale_id: string }[] | null
}

function mapPaymentRecordFromRow(row: PaymentRecordRow, creditId: string | null = null): PaymentRecord {
  const paymentsRel = row.payments
  const saleId = Array.isArray(paymentsRel) ? paymentsRel[0]?.sale_id : paymentsRel?.sale_id

  return {
    id: row.id,
    paymentId: row.payment_id,
    saleId: saleId ?? undefined,
    creditId,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method as PaymentRecord['paymentMethod'],
    description: row.description ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    storeId: row.store_id || undefined,
    status: (row.status as PaymentRecord['status']) || 'active',
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancelledByName: row.cancelled_by_name ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdAt: row.created_at,
  }
}

const PAYMENT_RECORDS_SELECT = '*, payments(sale_id)'

export class CreditsService {
  // Crear un nuevo crédito (en navegador usa API para evitar fallos por RLS con vendedores)
  static async createCredit(creditData: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credit> {
    const storeId = creditData.storeId || getCurrentUserStoreId() || '00000000-0000-0000-0000-000000000001'

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            saleId: creditData.saleId,
            clientId: creditData.clientId,
            clientName: creditData.clientName,
            invoiceNumber: creditData.invoiceNumber,
            totalAmount: creditData.totalAmount,
            paidAmount: creditData.paidAmount,
            pendingAmount: creditData.pendingAmount,
            status: creditData.status,
            dueDate: creditData.dueDate,
            lastPaymentAmount: creditData.lastPaymentAmount,
            lastPaymentDate: creditData.lastPaymentDate,
            lastPaymentUser: creditData.lastPaymentUser,
            createdBy: creditData.createdBy,
            createdByName: creditData.createdByName,
            storeId
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || res.statusText || 'Error al crear el crédito')
        }
        const newCredit = await res.json()
        if (creditData.createdBy && (!creditData.saleId || creditData.saleId === null)) {
          await AuthService.logActivity(
            creditData.createdBy,
            'credit_create',
            'credits',
            {
              description: `Crédito creado: ${creditData.clientName} - Factura: ${creditData.invoiceNumber} - Monto: $${creditData.totalAmount.toLocaleString('es-CO')}`,
              creditId: newCredit.id,
              invoiceNumber: creditData.invoiceNumber,
              clientName: creditData.clientName,
              clientId: creditData.clientId,
              totalAmount: creditData.totalAmount,
              pendingAmount: creditData.pendingAmount,
              dueDate: creditData.dueDate || null
            }
          )
        }
        return newCredit
      } catch (e) {
        throw e
      }
    }

    const { data, error } = await supabaseAdmin
      .from('credits')
      .insert([{
        sale_id: creditData.saleId,
        client_id: creditData.clientId,
        client_name: creditData.clientName,
        invoice_number: creditData.invoiceNumber,
        total_amount: creditData.totalAmount,
        paid_amount: creditData.paidAmount,
        pending_amount: creditData.pendingAmount,
        status: creditData.status,
        due_date: creditData.dueDate,
        last_payment_amount: creditData.lastPaymentAmount,
        last_payment_date: creditData.lastPaymentDate,
        last_payment_user: creditData.lastPaymentUser,
        created_by: creditData.createdBy,
        created_by_name: creditData.createdByName,
        store_id: storeId
      }])
      .select('*')
      .single()

    if (error) throw error

    const newCredit = {
      id: data.id,
      saleId: data.sale_id,
      clientId: data.client_id,
      clientName: data.client_name,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
      paidAmount: data.paid_amount,
      pendingAmount: data.pending_amount,
      status: data.status,
      dueDate: data.due_date,
      lastPaymentAmount: data.last_payment_amount,
      lastPaymentDate: data.last_payment_date,
      lastPaymentUser: data.last_payment_user,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      storeId: data.store_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    if (creditData.createdBy && (!creditData.saleId || creditData.saleId === null)) {
      await AuthService.logActivity(
        creditData.createdBy,
        'credit_create',
        'credits',
        {
          description: `Crédito creado: ${creditData.clientName} - Factura: ${creditData.invoiceNumber} - Monto: $${creditData.totalAmount.toLocaleString('es-CO')}`,
          creditId: newCredit.id,
          invoiceNumber: creditData.invoiceNumber,
          clientName: creditData.clientName,
          clientId: creditData.clientId,
          totalAmount: creditData.totalAmount,
          pendingAmount: creditData.pendingAmount,
          dueDate: creditData.dueDate || null
        }
      )
    }

    return newCredit
  }

  // Obtener todos los créditos
  static async getAllCredits(): Promise<Credit[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      // Obtener todos los créditos
      let query = supabase
        .from('credits')
        .select('*')

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar créditos de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo créditos de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { data: creditsData, error: creditsError } = await query.order('created_at', { ascending: false })

      if (creditsError) {
        // Error silencioso en producción
        throw creditsError
      }

      if (!creditsData || creditsData.length === 0) {

        return []
      }

      return await this.mapCreditsData(creditsData)
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Método optimizado para dashboard con filtrado por fecha
  static async getCreditsByDateRange(startDate?: Date, endDate?: Date): Promise<Credit[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()

      let query = supabase
        .from('credits')
        .select('*')

      // SIEMPRE filtrar por store_id si hay uno especificado
      // Incluso para super admins, si están viendo una microtienda específica, solo mostrar sus créditos
      if (storeId) {
        query = query.eq('store_id', storeId)
      }

      // Aplicar filtros de fecha si existen
      if (startDate) {
        const startUTC = new Date(Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0, 0, 0, 0
        ))
        query = query.gte('created_at', startUTC.toISOString())
      }
      if (endDate) {
        const endUTC = new Date(Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23, 59, 59, 999
        ))
        query = query.lte('created_at', endUTC.toISOString())
      }

      query = query.order('created_at', { ascending: false })

      const { data: creditsData, error: creditsError } = await query.limit(10000)

      if (creditsError) {
        // Error silencioso en producción
        throw creditsError
      }

      if (!creditsData || creditsData.length === 0) {
        return []
      }

      return await this.mapCreditsData(creditsData)
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Función auxiliar para mapear datos de créditos
  private static async mapCreditsData(creditsData: any[]): Promise<Credit[]> {
    // Obtener emails de usuarios únicos
    const userIds = [...new Set(creditsData.map(credit => credit.last_payment_user).filter(Boolean))]
    const userEmails: { [key: string]: string } = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (!usersError && users) {
        users.forEach(user => {
          userEmails[user.id] = user.email
        })
      }
    }

    return creditsData.map(credit => ({
      id: credit.id,
      saleId: credit.sale_id,
      clientId: credit.client_id,
      clientName: credit.client_name,
      invoiceNumber: credit.invoice_number,
      totalAmount: credit.total_amount,
      paidAmount: credit.paid_amount,
      pendingAmount: credit.pending_amount,
      status: credit.status,
      dueDate: credit.due_date,
      lastPaymentAmount: credit.last_payment_amount,
      lastPaymentDate: credit.last_payment_date,
      lastPaymentUser: credit.last_payment_user ? (userEmails[credit.last_payment_user] || credit.last_payment_user) : null,
      createdBy: credit.created_by,
      createdByName: credit.created_by_name,
      storeId: credit.store_id || undefined,
      createdAt: credit.created_at,
      updatedAt: credit.updated_at
    }))
  }

  // Obtener crédito por ID
  static async getCreditById(id: string): Promise<Credit | null> {
    const user = getCurrentUser()
    const storeId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    let query = supabase
      .from('credits')
      .select('*')
      .eq('id', id)

    // Misma lógica que getAllCredits: tienda principal incluye store_id null o MAIN_STORE_ID
    if (!storeId || storeId === MAIN_STORE_ID) {
      query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
    } else {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    // Obtener email del usuario si existe
    let userEmail = data.last_payment_user
    if (data.last_payment_user) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', data.last_payment_user)
        .single()

      if (user) {
        userEmail = user.email
      }
    }

    return {
      id: data.id,
      saleId: data.sale_id,
      clientId: data.client_id,
      clientName: data.client_name,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
      paidAmount: data.paid_amount,
      pendingAmount: data.pending_amount,
      status: data.status,
      dueDate: data.due_date,
      lastPaymentAmount: data.last_payment_amount,
      lastPaymentDate: data.last_payment_date,
      lastPaymentUser: userEmail,
      storeId: data.store_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /** Crédito vinculado a una venta (típicamente uno por venta). */
  static async getCreditBySaleId(saleId: string): Promise<Credit | null> {
    if (!saleId) return null
    const storeId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

    let query = supabase.from('credits').select('*').eq('sale_id', saleId)

    if (!storeId || storeId === MAIN_STORE_ID) {
      query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
    } else {
      query = query.eq('store_id', storeId)
    }

    const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(1)

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    if (!rows?.length) return null

    const data = rows[0]

    let userEmail = data.last_payment_user
    if (data.last_payment_user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('email')
        .eq('id', data.last_payment_user)
        .single()

      if (userRow) {
        userEmail = userRow.email
      }
    }

    return {
      id: data.id,
      saleId: data.sale_id,
      clientId: data.client_id,
      clientName: data.client_name,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
      paidAmount: data.paid_amount,
      pendingAmount: data.pending_amount,
      status: data.status,
      dueDate: data.due_date,
      lastPaymentAmount: data.last_payment_amount,
      lastPaymentDate: data.last_payment_date,
      lastPaymentUser: userEmail,
      storeId: data.store_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  // Obtener todos los créditos de un cliente
  static async getCreditsByClientId(clientId: string): Promise<Credit[]> {
    const user = getCurrentUser()
    const storeId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

    let query = supabase
      .from('credits')
      .select('*')
      .eq('client_id', clientId)

    // Filtrar por store_id:
    // - Si storeId es null o MAIN_STORE_ID, solo mostrar créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
    // - Si storeId es una microtienda, solo mostrar créditos de esa microtienda
    if (!storeId || storeId === MAIN_STORE_ID) {
      // Tienda principal: solo créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
      query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
    } else {
      // Microtienda: solo créditos de esa microtienda
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Obtener emails de usuarios únicos
    const userIds = [...new Set(data.map(credit => credit.last_payment_user).filter(Boolean))]
    const userEmails: { [key: string]: string } = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (!usersError && users) {
        users.forEach(user => {
          userEmails[user.id] = user.email
        })
      }
    }

    return data.map(credit => ({
      id: credit.id,
      saleId: credit.sale_id,
      clientId: credit.client_id,
      clientName: credit.client_name,
      invoiceNumber: credit.invoice_number,
      totalAmount: credit.total_amount,
      paidAmount: credit.paid_amount,
      pendingAmount: credit.pending_amount,
      status: credit.status,
      dueDate: credit.due_date,
      lastPaymentAmount: credit.last_payment_amount,
      lastPaymentDate: credit.last_payment_date,
      lastPaymentUser: credit.last_payment_user ? (userEmails[credit.last_payment_user] || credit.last_payment_user) : null,
      createdBy: credit.created_by,
      createdByName: credit.created_by_name,
      storeId: credit.store_id || undefined,
      createdAt: credit.created_at,
      updatedAt: credit.updated_at
    }))
  }

  // Actualizar crédito
  static async updateCredit(id: string, updates: Partial<Credit>): Promise<Credit> {
    // Verificar que el crédito pertenece a la tienda del usuario (si no es admin principal)
    const existingCredit = await this.getCreditById(id)
    if (!existingCredit) {
      throw new Error('Crédito no encontrado')
    }

    const user = getCurrentUser()
    const storeId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

    // Verificar que el crédito pertenece a la tienda actual (tienda principal = null o MAIN_STORE_ID es la misma)
    const userIsMainStore = !storeId || storeId === MAIN_STORE_ID
    const creditIsMainStore = !existingCredit.storeId || existingCredit.storeId === MAIN_STORE_ID
    const sameStore = storeId === existingCredit.storeId || (userIsMainStore && creditIsMainStore)
    if (!sameStore && !canAccessAllStores(user)) {
      throw new Error('No tienes permiso para actualizar este crédito')
    }

    const updateData: any = {}

    if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount
    if (updates.pendingAmount !== undefined) updateData.pending_amount = updates.pendingAmount
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.lastPaymentAmount !== undefined) updateData.last_payment_amount = updates.lastPaymentAmount
    if (updates.lastPaymentDate !== undefined) updateData.last_payment_date = updates.lastPaymentDate
    if (updates.lastPaymentUser !== undefined) updateData.last_payment_user = updates.lastPaymentUser

    const { data, error } = await supabaseAdmin
      .from('credits')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Obtener email del usuario si existe
    let userEmail = data.last_payment_user
    if (data.last_payment_user) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', data.last_payment_user)
        .single()

      if (user) {
        userEmail = user.email
      }
    }

    return {
      id: data.id,
      saleId: data.sale_id,
      clientId: data.client_id,
      clientName: data.client_name,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
      paidAmount: data.paid_amount,
      pendingAmount: data.pending_amount,
      status: data.status,
      dueDate: data.due_date,
      lastPaymentAmount: data.last_payment_amount,
      lastPaymentDate: data.last_payment_date,
      lastPaymentUser: userEmail,
      storeId: data.store_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  // Crear registro de pago
  static async createPaymentRecord(paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> {
    // Validar y obtener userId válido (evitar que falle para vendedoras por sesión/RLS)
    let userId = paymentData.userId
    let userName = paymentData.userName
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!userId || userId === 'current-user-id' || !uuidRegex.test(userId)) {
      const currentUser = await AuthService.getCurrentUser()
      if (currentUser?.id && uuidRegex.test(currentUser.id)) {
        userId = currentUser.id
        userName = currentUser.name || userName || 'Usuario'
      } else {
        // Fallback: usuario desde localStorage (store-helper) por si AuthService falló por RLS/red
        const localUser = getCurrentUser()
        if (localUser?.id && uuidRegex.test(localUser.id)) {
          userId = localUser.id
          userName = localUser.name || userName || 'Usuario'
        }
      }
      if (!userId || !uuidRegex.test(userId)) {
        throw new Error('No se pudo obtener el usuario actual. Por favor, cierra sesión e inicia sesión nuevamente.')
      }
    }
    
    // Obtener el crédito para crear un registro en la tabla payments
    const credit = await this.getCreditById(paymentData.creditId!)
    if (!credit) {
      throw new Error('Crédito no encontrado')
    }

    // Crear un registro en la tabla payments (sistema antiguo)
    const paymentInsertData = {
      sale_id: credit.saleId,
      client_id: credit.clientId,
      client_name: credit.clientName,
      invoice_number: credit.invoiceNumber,
      total_amount: credit.totalAmount,
      paid_amount: credit.paidAmount + paymentData.amount!,
      pending_amount: credit.pendingAmount - paymentData.amount!,
      last_payment_amount: paymentData.amount,
      last_payment_date: paymentData.paymentDate,
      last_payment_user: userId,
      status: (credit.pendingAmount - paymentData.amount! <= 0) ? 'completed' : 'partial'
    }

    const { data: paymentDataResult, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert([paymentInsertData])
      .select()
      .single()

    if (paymentError) throw paymentError

    // Crear registros de pago en payment_records
    let paymentRecords = []

    if (paymentData.paymentMethod === 'mixed' && paymentData.cashAmount && paymentData.transferAmount) {
      // Para pagos mixtos, crear DOS registros separados
      const baseDescription = paymentData.description || ''

      // Obtener store_id del crédito
      const storeId = credit.storeId || getCurrentUserStoreId() || '00000000-0000-0000-0000-000000000001'

      // Registro para efectivo
      const cashRecord = {
        payment_id: paymentDataResult.id,
        amount: paymentData.cashAmount,
        payment_date: paymentData.paymentDate,
        payment_method: 'cash',
        user_id: userId,
        user_name: userName,
        store_id: storeId,
        description: baseDescription ? `${baseDescription} (Parte en efectivo)` : 'Pago mixto - Parte en efectivo'
      }

      // Registro para transferencia
      const transferRecord = {
        payment_id: paymentDataResult.id,
        amount: paymentData.transferAmount,
        payment_date: paymentData.paymentDate,
        payment_method: 'transfer',
        user_id: userId,
        user_name: userName,
        store_id: storeId,
        description: baseDescription ? `${baseDescription} (Parte por transferencia)` : 'Pago mixto - Parte por transferencia'
      }

      // Insertar ambos registros
      const { data: cashData, error: cashError } = await supabaseAdmin
        .from('payment_records')
        .insert([cashRecord])
        .select()
        .single()

      if (cashError) throw cashError

      const { data: transferData, error: transferError } = await supabaseAdmin
        .from('payment_records')
        .insert([transferRecord])
        .select()
        .single()

      if (transferError) throw transferError

      paymentRecords = [cashData, transferData]

    } else {
      // Para pagos simples (cash o transfer), crear un solo registro
      // Obtener store_id del crédito
      const storeId = credit.storeId || getCurrentUserStoreId() || '00000000-0000-0000-0000-000000000001'

      const insertData: any = {
        payment_id: paymentDataResult.id,
        amount: paymentData.amount,
        payment_date: paymentData.paymentDate,
        payment_method: paymentData.paymentMethod,
        user_id: userId,
        user_name: userName,
        store_id: storeId
      }

      if (paymentData.description) {
        insertData.description = paymentData.description
      }

      const { data, error } = await supabaseAdmin
        .from('payment_records')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error

      paymentRecords = [data]
    }

    // Actualizar el crédito con el nuevo monto pendiente
    const previousPendingAmount = credit.pendingAmount
    const previousPaidAmount = credit.paidAmount
    const newPendingAmount = credit.pendingAmount - paymentData.amount!
    const newPaidAmount = credit.paidAmount + paymentData.amount!
    const newStatus = newPendingAmount <= 0 ? 'completed' : 'partial'

    // Actualizar el crédito en la tabla credits
    await this.updateCredit(credit.id, {
      pendingAmount: newPendingAmount,
      paidAmount: newPaidAmount,
      status: newStatus,
      lastPaymentAmount: paymentData.amount,
      lastPaymentDate: paymentData.paymentDate,
      lastPaymentUser: userId
    })

    // Log de actividad para el pago
    // Si el crédito se completa con este abono, el log incluirá esa información
    const isCompleted = newPendingAmount <= 0

    if (userId) {
      await AuthService.logActivity(
        userId,
        'credit_payment',
        'credits',
        {
          description: isCompleted
            ? `Pago completado: ${credit.clientName} - Factura: ${credit.invoiceNumber} - Monto: $${paymentData.amount!.toLocaleString('es-CO')} - Método: ${paymentData.paymentMethod === 'cash' ? 'Efectivo' : paymentData.paymentMethod === 'transfer' ? 'Transferencia' : 'Mixto'}`
            : `Abono registrado: ${credit.clientName} - Factura: ${credit.invoiceNumber} - Monto: $${paymentData.amount!.toLocaleString('es-CO')} - Método: ${paymentData.paymentMethod === 'cash' ? 'Efectivo' : paymentData.paymentMethod === 'transfer' ? 'Transferencia' : 'Mixto'}`,
          creditId: credit.id,
          invoiceNumber: credit.invoiceNumber,
          clientName: credit.clientName,
          paymentAmount: paymentData.amount!,
          paymentMethod: paymentData.paymentMethod,
          cashAmount: paymentData.cashAmount || null,
          transferAmount: paymentData.transferAmount || null,
          previousPendingAmount: previousPendingAmount,
          newPendingAmount: newPendingAmount,
          previousPaidAmount: previousPaidAmount,
          newPaidAmount: newPaidAmount,
          paymentDescription: paymentData.description || null,
          // Información adicional si el crédito se completó
          isCompleted: isCompleted,
          totalAmount: isCompleted ? credit.totalAmount : null,
          totalPaid: isCompleted ? newPaidAmount : null,
          completedAt: isCompleted ? paymentData.paymentDate : null
        }
      )
    }

    // Actualizar el estado de la venta si el crédito se completó
    if (newPendingAmount <= 0) {
      // El crédito se completó, actualizar el estado de la venta
      const { error: saleUpdateError } = await supabase
        .from('sales')
        .update({ status: 'completed' })
        .eq('id', credit.saleId)

      if (saleUpdateError) {
        // Error silencioso en producción
        // No lanzamos error aquí para no interrumpir el flujo del pago
      }
    }

    // Retornar el primer registro (o crear un registro consolidado para la respuesta)
    const firstRecord = paymentRecords[0]

    return {
      id: firstRecord.id,
      creditId: paymentData.creditId, // Mantener el creditId original
      amount: paymentData.amount, // Monto total original
      paymentDate: firstRecord.payment_date,
      paymentMethod: paymentData.paymentMethod, // Método original (mixed)
      cashAmount: paymentData.cashAmount, // Mantener los valores originales
      transferAmount: paymentData.transferAmount, // Mantener los valores originales
      description: paymentData.description,
      userId: firstRecord.user_id,
      userName: firstRecord.user_name,
      storeId: firstRecord.store_id || credit.storeId || undefined,
      createdAt: firstRecord.created_at
    }
  }

  // Obtener historial de pagos de un crédito
  static async getPaymentHistory(creditId: string): Promise<PaymentRecord[]> {
    // Obtener el crédito para buscar en payments
    const credit = await this.getCreditById(creditId)
    if (!credit) {
      throw new Error('Crédito no encontrado')
    }

    // Estrategia simple (como funcionaba antes): buscar payments y luego payment_records
    // PRIORIDAD 1: Buscar por sale_id (más confiable)
    let paymentIds: string[] = []

    if (credit.saleId) {
      const { data: paymentsBySale, error: saleError } = await supabase
        .from('payments')
        .select('id')
        .eq('sale_id', credit.saleId)

      if (!saleError && paymentsBySale && paymentsBySale.length > 0) {
        paymentIds = paymentsBySale.map(p => p.id)
      }
    }

    // PRIORIDAD 2: Si no encontramos por sale_id, buscar por invoice_number (como antes)
    if (paymentIds.length === 0) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('invoice_number', credit.invoiceNumber)
        .eq('client_id', credit.clientId)

      if (paymentsError) throw paymentsError

      if (payments && payments.length > 0) {
        paymentIds = payments.map(p => p.id)
      }
    }

    // Si aún no encontramos, intentar variaciones del invoice_number
    if (paymentIds.length === 0 && credit.invoiceNumber) {
      const normalizedInvoiceNumber = credit.invoiceNumber.replace(/^#|\s/g, '')
      const invoiceVariations = [
        `#${normalizedInvoiceNumber}`,
        normalizedInvoiceNumber,
      ].filter(Boolean)

      for (const invoiceVar of invoiceVariations) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('invoice_number', invoiceVar)
          .eq('client_id', credit.clientId)

        if (!paymentsError && payments && payments.length > 0) {
          paymentIds = payments.map(p => p.id)
          break
        }
      }
    }

    if (paymentIds.length === 0) {
      return [] // No hay pagos registrados
    }

    // Obtener los registros de pago para estos payments (lógica simple como antes)
    const { data, error } = await supabase
      .from('payment_records')
      .select(PAYMENT_RECORDS_SELECT)
      .in('payment_id', paymentIds)
      .order('payment_date', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      return []
    }

    return data.map((payment) => mapPaymentRecordFromRow(payment as PaymentRecordRow, creditId))
  }

  /** Crédito asociado a una venta (por sale_id o número de factura). */
  static async resolveCreditForSale(sale: {
    id: string
    invoiceNumber?: string | null
  }): Promise<Credit | null> {
    const bySale = await this.getCreditBySaleId(sale.id)
    if (bySale) return bySale
    if (sale.invoiceNumber) {
      return this.getCreditByInvoiceNumber(sale.invoiceNumber)
    }
    return null
  }

  /** Marca abonos activos como cancelados (reportes; no implica devolución en caja). */
  static async cancelActivePaymentRecordsForCredit(
    creditId: string,
    reason: string,
    userId: string,
    userName: string
  ): Promise<number> {
    const paymentHistory = await this.getPaymentHistory(creditId)
    const now = new Date().toISOString()
    let activeTotal = 0

    for (const payment of paymentHistory) {
      if (payment.status === 'cancelled') continue
      activeTotal += payment.amount
      const { error } = await supabaseAdmin
        .from('payment_records')
        .update({
          status: 'cancelled',
          cancelled_at: now,
          cancelled_by: userId,
          cancelled_by_name: userName,
          cancellation_reason: reason,
        })
        .eq('id', payment.id)

      if (error) {
        throw new Error(`Error al anular abono: ${error.message}`)
      }
    }

    return activeTotal
  }

  /** Crédito anulado: estado cancelled y montos en cero. */
  static async markCreditAsCancelled(
    creditId: string,
    options: { reason: string; userId: string; userName: string }
  ): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('credits')
      .update({
        total_amount: 0,
        pending_amount: 0,
        paid_amount: 0,
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: options.userId,
        cancelled_by_name: options.userName,
        cancellation_reason: options.reason,
        updated_at: now,
      })
      .eq('id', creditId)

    if (error) {
      throw new Error(`Error al anular el crédito: ${error.message}`)
    }

    const { data: creditRow } = await supabaseAdmin
      .from('credits')
      .select('invoice_number, client_id')
      .eq('id', creditId)
      .maybeSingle()

    if (creditRow?.invoice_number && creditRow.client_id) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: now,
          cancelled_by: options.userId,
          cancelled_by_name: options.userName,
          cancellation_reason: options.reason,
        })
        .eq('invoice_number', creditRow.invoice_number)
        .eq('client_id', creditRow.client_id)
    }
  }

  /**
   * Anula crédito por sale_id (admin), p. ej. si RLS impidió resolverlo antes.
   * Devuelve true si había un crédito activo y se anuló.
   */
  static async markCreditCancelledForSaleIfExists(
    saleId: string,
    options: { reason: string; userId: string; userName: string }
  ): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('credits')
      .select('id, status')
      .eq('sale_id', saleId)
      .neq('status', 'cancelled')
      .limit(1)

    if (error || !data?.length) return false

    const creditId = data[0].id as string
    await this.cancelActivePaymentRecordsForCredit(
      creditId,
      options.reason,
      options.userId,
      options.userName
    )
    await this.markCreditAsCancelled(creditId, options)
    return true
  }

  // Anular un crédito y todos sus abonos
  static async cancelCredit(creditId: string, reason: string, userId: string, userName: string): Promise<{ success: boolean, totalRefund: number }> {
    try {
      const credit = await this.getCreditById(creditId)
      if (!credit) {
        throw new Error('Crédito no encontrado')
      }

      if (credit.status === 'cancelled' || (credit.totalAmount === 0 && credit.pendingAmount === 0)) {
        throw new Error('El crédito ya está anulado')
      }

      const totalRefund = await this.cancelActivePaymentRecordsForCredit(
        creditId,
        reason,
        userId,
        userName
      )

      await this.markCreditAsCancelled(creditId, { reason, userId, userName })

      // RESTAURAR STOCK y anular venta asociada
      try {
        const { SalesService } = await import('./sales-service')
        const { ProductsService } = await import('./products-service')

        const sale = credit.saleId ? await SalesService.getSaleById(credit.saleId) : null
        if (sale?.items?.length && sale.status !== 'cancelled') {
          const stockReturnItems = sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            productName: item.productName,
          }))
          await ProductsService.returnStockFromSaleBatch(stockReturnItems, userId, sale.storeId ?? null)
        }

        if (sale && sale.status !== 'cancelled' && credit.saleId) {
          await supabaseAdmin
            .from('sales')
            .update({
              status: 'cancelled',
              cancellation_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq('id', credit.saleId)
        }
      } catch {
        // No interrumpir si falla stock/venta; el crédito ya quedó anulado
      }

      return { success: true, totalRefund }
    } catch (error) {
      throw error
    }
  }

  // Obtener todos los registros de pago (abonos)
  static async getAllPaymentRecords(): Promise<PaymentRecord[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      let query = supabase
        .from('payment_records')
        .select(PAYMENT_RECORDS_SELECT)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.order('payment_date', { ascending: false })

      if (error) throw error

      return data.map((payment) => mapPaymentRecordFromRow(payment as PaymentRecordRow, null))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Método optimizado para dashboard con filtrado por fecha de pago
  static async getPaymentRecordsByDateRange(startDate?: Date, endDate?: Date): Promise<PaymentRecord[]> {
    try {
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let query = supabase
        .from('payment_records')
        .select(PAYMENT_RECORDS_SELECT)
        .order('payment_date', { ascending: false })

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar pagos de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar pagos de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo pagos de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo pagos de esa microtienda
        query = query.eq('store_id', storeId)
      }

      // Aplicar filtros de fecha si existen (usar payment_date).
      // Usar las fechas tal cual vienen del frontend (ya en hora local del usuario) para que
      // los abonos del día sumen correctamente en efectivo y total de ingresos.
      if (startDate) {
        query = query.gte('payment_date', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('payment_date', endDate.toISOString())
      }

      const { data, error } = await query.limit(10000)

      if (error) throw error

      return data.map((payment) => mapPaymentRecordFromRow(payment as PaymentRecordRow, null))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Obtener crédito por número de factura
  static async getCreditByInvoiceNumber(invoiceNumber: string): Promise<Credit | null> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let query = supabase
        .from('credits')
        .select('*')
        .eq('invoice_number', invoiceNumber)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar créditos de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo créditos de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo créditos de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw error
      }

      return {
        id: data.id,
        saleId: data.sale_id,
        clientId: data.client_id,
        clientName: data.client_name,
        invoiceNumber: data.invoice_number,
        totalAmount: data.total_amount,
        paidAmount: data.paid_amount,
        pendingAmount: data.pending_amount,
        status: data.status,
        dueDate: data.due_date,
        lastPaymentAmount: data.last_payment_amount,
        lastPaymentDate: data.last_payment_date,
        lastPaymentUser: data.last_payment_user,
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        storeId: data.store_id || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Método optimizado para obtener resumen de créditos con soporte para grandes volúmenes
  static async getCreditsSummary(): Promise<{
    totalDebt: number,
    pendingCreditsCount: number
  }> {
    try {
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let totalDebt = 0
      let pendingCreditsCount = 0
      let hasMore = true
      let offset = 0
      const limit = 1000

      while (hasMore) {
        let query = supabase
          .from('credits')
          .select('pending_amount, total_amount')
          .or('status.eq.pending,status.eq.partial')
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

        data.forEach(c => {
          const pending = c.pending_amount || c.total_amount || 0
          if (pending > 0) {
            totalDebt += pending
            pendingCreditsCount++
          }
        })

        if (data.length < limit) {
          hasMore = false
        } else {
          offset += limit
        }
      }

      return { totalDebt, pendingCreditsCount }
    } catch (error) {
      console.error('Error en getCreditsSummary:', error)
      return { totalDebt: 0, pendingCreditsCount: 0 }
    }
  }
}
