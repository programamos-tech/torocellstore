/**
 * Tamaño estándar de modales (referencia: Nuevo producto).
 * Ancho ~72rem / alto viewport con márgenes.
 */
export const MODAL_PANEL_SIZE =
  'w-full max-w-[min(72rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-4rem)]'

/** Contenedor del panel (añadir colores/bordes propios encima) */
export const MODAL_PANEL =
  `flex ${MODAL_PANEL_SIZE} flex-col overflow-hidden rounded-2xl shadow-2xl`

/** Padding del backdrop alrededor del panel */
export const MODAL_BACKDROP_PAD = 'px-3 py-5 sm:py-8'
