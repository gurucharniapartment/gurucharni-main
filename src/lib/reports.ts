// Pure helpers for monthly / range expense reporting. Fully unit-tested.
import type { Expense, Payment } from './types'
import { monthIndex } from './dates'

export interface MonthTotal {
  monthIdx: number
  inAmt: number // maintenance collected that month (money in)
  outAmt: number // expenses that month (money out)
}

/**
 * Money-in (non-void payments) and money-out (non-void expenses) per month,
 * for every month in [fromIdx, toIdx], newest month first.
 */
export function monthlyTotals(
  payments: Payment[],
  expenses: Expense[],
  fromIdx: number,
  toIdx: number,
): MonthTotal[] {
  const map = new Map<number, MonthTotal>()
  for (let m = fromIdx; m <= toIdx; m++) map.set(m, { monthIdx: m, inAmt: 0, outAmt: 0 })
  for (const p of payments) {
    if (p.is_void) continue
    const row = map.get(monthIndex(p.payment_date))
    if (row) row.inAmt += p.amount
  }
  for (const e of expenses) {
    if (e.is_void) continue
    const row = map.get(monthIndex(e.expense_date))
    if (row) row.outAmt += e.amount
  }
  return [...map.values()].sort((a, b) => b.monthIdx - a.monthIdx)
}

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
