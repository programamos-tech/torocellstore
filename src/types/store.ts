export interface Store {
  id: string
  name: string
  /** Prefijo de serial de factura (ej. ZT → ZT-00001). */
  invoicePrefix?: string
  nit?: string
  logo?: string
  address?: string
  city?: string
  phone?: string
  isActive: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
}
