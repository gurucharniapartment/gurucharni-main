import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Resident/family name for a flat (falls back to id). */
export function flatName(
  flat: { id: string; label_en: string; label_mr: string } | undefined,
  lang: 'en' | 'mr',
): string {
  if (!flat) return ''
  return (lang === 'mr' ? flat.label_mr : flat.label_en) || flat.id
}

/** "G1 · Samant" — code + name, for compact lists/dropdowns. */
export function flatLabel(
  flat: { id: string; label_en: string; label_mr: string } | undefined,
  lang: 'en' | 'mr',
): string {
  if (!flat) return ''
  return `${flat.id} · ${flatName(flat, lang)}`
}

/** Format a whole-rupee integer as ₹1,234 (Indian grouping); negatives as −₹1,234. */
export function formatRupees(amount: number): string {
  const n = Math.round(amount)
  return (n < 0 ? '−' : '') + '₹' + Math.abs(n).toLocaleString('en-IN')
}
