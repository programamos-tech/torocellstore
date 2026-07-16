'use client'

import type { ReactNode } from 'react'
import type { PublicCatalogStoreInfo } from '@/lib/public-catalog'
import { TiendaCartProvider } from '@/contexts/tienda-cart-context'
import { TiendaFavoritesProvider } from '@/contexts/tienda-favorites-context'
import { CartDrawer } from '@/components/tienda/cart-drawer'
import { TiendaWhatsAppButton } from '@/components/tienda/tienda-whatsapp-button'

export function TiendaProviders({
  children,
  store
}: {
  children: ReactNode
  store?: PublicCatalogStoreInfo | null
}) {
  return (
    <TiendaFavoritesProvider>
      <TiendaCartProvider>
        {children}
        <CartDrawer />
        <TiendaWhatsAppButton store={store} />
      </TiendaCartProvider>
    </TiendaFavoritesProvider>
  )
}
