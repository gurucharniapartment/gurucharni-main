import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const base =
  'w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[13px] font-medium text-[var(--color-foreground)]">{label}</span>
      {children}
    </label>
  )
}
