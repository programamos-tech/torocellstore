'use client'

import { TIENDA_ANNOUNCEMENT_ITEMS } from '@/config/tienda-storefront'

function AnnouncementItem({ text }: { text: string }) {
  const parts = text.split(' · ')
  const main = parts[0] ?? text
  const accent = parts[1]

  return (
    <span className="flex shrink-0 items-center gap-3 sm:gap-4">
      <span className="whitespace-nowrap text-[11px] font-medium tracking-[0.12em] text-[#9a968f] sm:text-xs">
        {main}
        {accent && (
          <>
            <span className="mx-2 text-white/20" aria-hidden>
              ·
            </span>
            <span className="font-medium text-[#d4d0c8]">{accent}</span>
          </>
        )}
      </span>
      <span
        className="h-1 w-1 shrink-0 rounded-full bg-white/20"
        aria-hidden
      />
    </span>
  )
}

export function TiendaAnnouncementBar() {
  const items = [...TIENDA_ANNOUNCEMENT_ITEMS, ...TIENDA_ANNOUNCEMENT_ITEMS]

  return (
    <div
      className="relative z-40 overflow-hidden bg-[#080808]"
      role="region"
      aria-label="Anuncios de la tienda"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(255,255,255,0.04), transparent 55%)'
        }}
      />

      <div className="tienda-marquee-fade relative flex overflow-hidden py-2.5 sm:py-3">
        <div className="tienda-marquee-track flex w-max items-center gap-8 sm:gap-12">
          {items.map((text, i) => (
            <AnnouncementItem key={`${text}-${i}`} text={text} />
          ))}
        </div>
      </div>
    </div>
  )
}
