import type { Metadata } from 'next'
import { TiendaProviders } from '@/components/tienda/tienda-providers'
import { tiendaDisplay, tiendaSans } from '@/app/tienda/tienda-fonts'
import { getPublicCatalogStoreInfo } from '@/lib/public-catalog'
import { cn } from '@/lib/utils'

const siteUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_CATALOG_SITE_URL || 'https://torocell.store')
  } catch {
    return new URL('https://torocell.store')
  }
})()

export const metadata: Metadata = {
  title: 'Telefonía | TOROCELL STORE Sincelejo',
  description:
    'Catálogo de celulares y accesorios en TELEFONÍA TOROCELL STORE, Sincelejo. Consulta disponibilidad y precios referenciales.',
  metadataBase: siteUrl,
  openGraph: {
    title: 'TOROCELL STORE',
    description: 'Celulares, tablets y accesorios en Sincelejo.',
    locale: 'es_CO',
    type: 'website',
    siteName: 'TOROCELL STORE'
  }
}

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const store = await getPublicCatalogStoreInfo()

  return (
    <div
      className={cn(
        'tienda-storefront min-h-dvh text-[#E8F2F5] [color-scheme:dark]',
        tiendaDisplay.variable,
        tiendaSans.variable
      )}
      data-theme="dark"
    >
      <TiendaProviders store={store}>{children}</TiendaProviders>
    </div>
  )
}
