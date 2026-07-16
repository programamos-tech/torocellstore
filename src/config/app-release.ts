/**
 * Novedades del modal (manual; no lee Git). Tras cada deploy: sube `CURRENT_RELEASE_ID`
 * y edita `items`. Para un aviso “solo de hoy”, alinea el texto con los commits del día.
 */
export const CURRENT_RELEASE_ID = '2026-05-22-1'

/** Pon en `true` solo cuando quieras mostrar el modal tras un deploy. */
export const RELEASE_NOTES_MODAL_ENABLED = false

export const releaseNotes = {
  title: 'Novedades',
  intro: 'Versión 2.9. Reportes, barra superior y abonos en TOROCELL STORE.',
  items: [
    'Reportes: la ganancia bruta incluye abonos de créditos (proporcional al pago del día), además de ventas al contado.',
    'Barra superior en tablet: ya no tapa el titular de la página; navegación arriba y contenido debajo.',
    'Búsqueda global corregida (sin bucle al buscar códigos como 001).',
    'Notificaciones con productos sin stock y retención de 24 h en la lista.',
  ],
} as const

export const RELEASE_STORAGE_KEY = 'zonat:last-seen-release'
