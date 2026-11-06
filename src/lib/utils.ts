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
