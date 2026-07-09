import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a whole-rupee integer as ₹1,234 (Indian grouping). */
export function formatRupees(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}
