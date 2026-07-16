import { BadgeCheck, Headphones, ShieldCheck, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const BADGES = [
  {
    icon: ShieldCheck,
    title: '100% Original',
    text: 'Garantía y respaldo TOROCELL STORE'
  },
  {
    icon: Truck,
    title: 'Envíos',
    text: 'A toda Colombia 100% seguros'
  },
  {
    icon: Headphones,
    title: 'WhatsApp',
    text: 'Asesoría personalizada en tienda'
  },
  {
    icon: BadgeCheck,
    title: 'Nuevos',
    text: 'Equipos y accesorios seleccionados'
  }
] as const

export function TiendaTrustBadges() {
  return (
    <section className="relative z-[2] -mt-12 bg-[#0a0a0a] pb-10 pt-2 sm:-mt-16 sm:pb-14 sm:pt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <div
            className="hidden h-px w-16 bg-gradient-to-r from-transparent to-[#b8973f]/45 sm:block lg:w-28"
            aria-hidden
          />
          <h2 className="text-center text-[10px] font-bold uppercase leading-snug tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]">
            <span className="text-[#eceae6]">Tu tienda de confianza en </span>
            <span className="text-[#b8973f]">tecnología</span>
          </h2>
          <div
            className="hidden h-px w-16 bg-gradient-to-l from-transparent to-[#b8973f]/45 sm:block lg:w-28"
            aria-hidden
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-10 sm:grid-cols-4 sm:gap-y-0">
          {BADGES.map(({ icon: Icon, title, text }, index) => (
            <div
              key={title}
              className={cn(
                'flex flex-col items-center px-2 text-center sm:px-5',
                index > 0 && 'sm:border-l sm:border-[#b8973f]/20'
              )}
            >
              <Icon
                className="h-8 w-8 text-[#b8973f] sm:h-9 sm:w-9"
                strokeWidth={1.25}
                aria-hidden
              />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#eceae6] sm:mt-4 sm:text-xs sm:tracking-[0.16em]">
                {title}
              </p>
              <p className="mt-1.5 max-w-[11rem] text-[10px] leading-relaxed text-[#9a968f] sm:text-[11px]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
