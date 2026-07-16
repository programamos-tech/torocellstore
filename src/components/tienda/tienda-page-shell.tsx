'use client'

import type { ReactNode } from 'react'
import type { PublicCatalogStoreInfo } from '@/lib/public-catalog'
import { TiendaAnnouncementBar } from '@/components/tienda/tienda-announcement-bar'
import { TiendaHeader } from '@/components/tienda/tienda-header'
import { TiendaFooter } from '@/components/tienda/tienda-footer'

export function TiendaPageShell({
  store,
  children
}: {
  store?: PublicCatalogStoreInfo | null
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TiendaAnnouncementBar />
      <TiendaHeader storeName={store?.name} />
      {children}
      <TiendaFooter store={store} />
    </div>
  )
}
