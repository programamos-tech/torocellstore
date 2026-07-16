import { Cormorant_Garamond, Montserrat } from 'next/font/google'

export const tiendaDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-tienda-display',
  display: 'swap',
})

export const tiendaSans = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-tienda-sans',
  display: 'swap',
})
