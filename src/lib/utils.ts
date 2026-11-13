import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** '2026-11-06T08:55:43+07:00' → '2026-11-06, 08:55:43' (giữ nguyên giờ của backend, không đổi múi giờ) */
export const formatTs = (iso: string) => `${iso.slice(0, 10)}, ${iso.slice(11, 19)}`

const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
] as const

/** '…' → "2 giờ trước" / "2 hours ago" theo ngôn ngữ (`intl` = LOCALES[locale].intl) */
export function relativeTime(iso: string, intl: string) {
  const seconds = (Date.parse(iso) - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' })
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  return rtf.format(0, 'second') // "bây giờ" / "now"
}
