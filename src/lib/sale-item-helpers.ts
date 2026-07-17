import type { SaleItem } from '@/types'

export function isServiceSaleItem(
  item: Pick<SaleItem, 'itemType' | 'productId'>
): boolean {
  return item.itemType === 'service' || !item.productId
}

/** Mapea una fila de sale_items (snake_case) al tipo SaleItem de la app. */
export function mapDbSaleItem(item: {
  id: string
  product_id?: string | null
  product_name: string
  product_reference_code?: string | null
  quantity: number
  unit_price: number
  discount?: number | null
  discount_type?: string | null
  tax?: number | null
  total: number
  item_type?: string | null
}): SaleItem {
  const itemType: SaleItem['itemType'] =
    item.item_type === 'service' || !item.product_id ? 'service' : 'product'

  return {
    id: item.id,
    productId: item.product_id ?? null,
    productName: item.product_name,
    productReferenceCode:
      item.product_reference_code ||
      (itemType === 'service' ? 'SERVICIO' : 'N/A'),
    quantity: item.quantity,
    unitPrice: item.unit_price,
    discount: item.discount || 0,
    discountType: (item.discount_type as SaleItem['discountType']) || 'amount',
    tax: item.tax || 0,
    total: item.total,
    itemType,
  }
}

export function toDbSaleItemRow(saleId: string, item: SaleItem) {
  const isService = isServiceSaleItem(item)
  return {
    sale_id: saleId,
    product_id: isService ? null : item.productId,
    product_name: item.productName,
    product_reference_code: isService
      ? 'SERVICIO'
      : item.productReferenceCode || null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount: item.discount || 0,
    total: item.total,
    item_type: isService ? 'service' : 'product',
  }
}
