import type { Product } from '@/types'
import { supabase } from '@/lib/supabase'
import { getCurrentUserStoreId } from '@/lib/store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

type AssignmentRow = {
  product_id: string
  supplier_id: string
  suppliers:
    | { id: string; name: string; supplier_number: number }
    | Array<{ id: string; name: string; supplier_number: number }>
    | null
}

function activeStoreId(): string {
  return getCurrentUserStoreId() || MAIN_STORE_ID
}

export class ProductSupplierService {
  static async enrichProducts(products: Product[]): Promise<Product[]> {
    if (products.length === 0) return products

    const productIds = [...new Set(products.map((product) => product.id).filter(Boolean))]
    const { data, error } = await supabase
      .from('product_supplier_assignments')
      .select('product_id, supplier_id, suppliers(id, name, supplier_number)')
      .eq('store_id', activeStoreId())
      .in('product_id', productIds)

    if (error) {
      console.error('[ProductSupplierService] No se pudieron cargar proveedores:', error)
      return products
    }

    const assignmentByProduct = new Map<
      string,
      { supplierId: string; supplierName?: string; supplierNumber?: number }
    >()

    ;((data || []) as unknown as AssignmentRow[]).forEach((row) => {
      const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers
      assignmentByProduct.set(row.product_id, {
        supplierId: row.supplier_id,
        supplierName: supplier?.name,
        supplierNumber: supplier ? Number(supplier.supplier_number) : undefined,
      })
    })

    return products.map((product) => ({
      ...product,
      supplierId: assignmentByProduct.get(product.id)?.supplierId || null,
      supplierName: assignmentByProduct.get(product.id)?.supplierName,
      supplierNumber: assignmentByProduct.get(product.id)?.supplierNumber,
    }))
  }

  static async setAssignment(productId: string, supplierId?: string | null): Promise<void> {
    const storeId = activeStoreId()

    if (!supplierId) {
      const { error } = await supabase
        .from('product_supplier_assignments')
        .delete()
        .eq('store_id', storeId)
        .eq('product_id', productId)
      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('product_supplier_assignments')
      .upsert(
        {
          store_id: storeId,
          product_id: productId,
          supplier_id: supplierId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,product_id' }
      )

    if (error) throw error
  }

  static async getProductsBySupplier(supplierId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('product_supplier_assignments')
      .select('product_id')
      .eq('store_id', activeStoreId())
      .eq('supplier_id', supplierId)

    if (error) throw error
    const productIds = (data || []).map((row) => row.product_id)
    if (productIds.length === 0) return []

    const { ProductsService } = await import('@/lib/products-service')
    const products = await Promise.all(
      productIds.map((productId) => ProductsService.getProductById(productId))
    )
    return this.enrichProducts(products.filter((product): product is Product => Boolean(product)))
  }
}
