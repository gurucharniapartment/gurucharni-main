// Pure helpers for monthly / range expense reporting. Fully unit-tested.
import type { Expense } from './types'

/** Non-void expenses whose date falls within [fromISO, toISO] inclusive. */
export function expensesInRange(expenses: Expense[], fromISO: string, toISO: string): Expense[] {
  return expenses.filter((e) => !e.is_void && e.expense_date >= fromISO && e.expense_date <= toISO)
}

export interface CategoryTotal {
  categoryId: number
  amount: number
}

/** Sum amounts grouped by category, largest first. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const m = new Map<number, number>()
  for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.amount)
  return [...m.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function sumAmount(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0)
}
