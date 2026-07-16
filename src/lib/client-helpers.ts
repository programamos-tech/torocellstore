import { Client } from '@/types'

/**
 * Cliente-ficha creado por el sistema para transferencias / facturación interna entre tiendas.
 * No confundir con un cliente de negocio que solo comparta nombre con una microtienda.
 */
export function isStoreClient(client: Client): boolean {
  const doc = (client.document || '').trim().toUpperCase()
  return doc.startsWith('STORE-')
}
