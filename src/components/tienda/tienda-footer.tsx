import Image from 'next/image'
import Link from 'next/link'
import { Instagram, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { PublicCatalogStoreInfo } from '@/lib/public-catalog'
import { TIENDA_LOGO } from '@/config/tienda-theme'

type TiendaFooterProps = {
  store?: PublicCatalogStoreInfo | null
}

export function TiendaFooter({ store }: TiendaFooterProps) {
  const year = new Date().getFullYear()
  const city = store?.city?.trim() || 'Sincelejo, Sucre'
  const address = store?.address?.trim() || 'Carrera 20 #22-02'
  const phone = store?.phone?.trim()

  return (
    <footer className="mt-auto bg-[#000000] text-[#9DC2D1]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/tienda" className="inline-flex items-center gap-3">
              <Image
                src={TIENDA_LOGO}
                alt="TOROCELL STORE"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
                unoptimized
              />
              <div>
                <p className="tienda-display text-2xl font-semibold tracking-wide text-[#E8F2F5]">TOROCELL STORE</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B8A96]">
                  Más que tecnología
                </p>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              {store?.name ?? 'TOROCELL STORE'} — celulares, tablets y accesorios con respaldo y asesoría en
              tienda.
            </p>
            <div className="mt-6 inline-flex rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9DC2D1]">
                Tecnología que te conecta
              </span>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6B8A96]">Tienda</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tienda" className="transition-colors hover:text-[#E8F2F5]">
                  Inicio
                </Link>
              </li>
              <li>
                <a href="#catalogo" className="transition-colors hover:text-[#E8F2F5]">
                  Catálogo
                </a>
              </li>
              <li>
                <Link href="/tienda/favoritos" className="transition-colors hover:text-[#E8F2F5]">
                  Favoritos
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-[#E8F2F5]">
                  Acceso empresas
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6B8A96]">Contacto</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9DC2D1]" strokeWidth={1.75} />
                <span>
                  {address}
                  <br />
                  {city}
                </span>
              </li>
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-[#9DC2D1]" strokeWidth={1.75} />
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-[#E8F2F5]">
                    {phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#9DC2D1]" strokeWidth={1.75} />
                <span>Asesoría por WhatsApp en tienda</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6B8A96]">Síguenos</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-[#E8F2F5]"
                >
                  <Instagram className="h-4 w-4" strokeWidth={1.75} />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between gap-4 pt-4 text-xs">
          <p>© {year} TOROCELL STORE. Todos los derechos reservados.</p>
          <Image
            src="/logo.jpeg"
            alt="Hecho por Berea — Software e IA a medida"
            width={72}
            height={32}
            className="h-auto w-14 shrink-0 object-contain opacity-50 transition-opacity hover:opacity-75 sm:w-16"
            unoptimized
          />
        </div>
      </div>
    </footer>
  )
}
