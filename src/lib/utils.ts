import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a whole-rupee integer as ₹1,234 (Indian grouping); negatives as −₹1,234. */
export function formatRupees(amount: number): string {
  const n = Math.round(amount)
  return (n < 0 ? '−' : '') + '₹' + Math.abs(n).toLocaleString('en-IN')
}
