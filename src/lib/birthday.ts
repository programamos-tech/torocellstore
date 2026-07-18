const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Fecha local `YYYY-MM-DD` (evita el desfase UTC de `toISOString`). */
export function localTodayIsoDate(today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Compara solo mes y día. Evita `new Date('YYYY-MM-DD')`, que se interpreta
 * como UTC y puede cambiar de fecha en Colombia.
 * El 29 de febrero se celebra el 28 en años no bisiestos.
 */
export function isBirthdayToday(
  birthDate?: string | null,
  today: Date = new Date()
): boolean {
  if (!birthDate) return false

  const match = DATE_ONLY_PATTERN.exec(birthDate)
  if (!match) return false

  const month = Number(match[2])
  const day = Number(match[3])
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  if (month === todayMonth && day === todayDay) return true

  if (month === 2 && day === 29 && todayMonth === 2 && todayDay === 28) {
    return !isLeapYear(today.getFullYear())
  }

  return false
}

export function formatBirthDateDisplay(birthDate?: string | null): string {
  if (!birthDate) return ''
  const match = DATE_ONLY_PATTERN.exec(birthDate)
  if (!match) return birthDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

export const BIRTHDAY_DISCOUNT_OPTIONS = [10, 20, 30, 40, 50] as const
