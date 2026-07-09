import { describe, it, expect } from 'vitest'
import { expensesInRange, totalsByCategory, sumAmount } from './reports'
import { toCSV } from './csv'
import type { Expense } from './types'

function exp(id: number, categoryId: number, amount: number, date: string, is_void = false): Expense {
  return {
    id, category_id: categoryId, amount, expense_date: date, remark: 'r',
    is_auto: false, is_void, created_by: null, created_at: '',
  }
}

const EXPENSES: Expense[] = [
  exp(1, 1, 3000, '2026-07-05'), // water
  exp(2, 2, 1200, '2026-07-12'), // electricity
  exp(3, 1, 2000, '2026-07-20'), // water
  exp(4, 3, 2500, '2026-07-01'), // watchman
  exp(5, 2, 999, '2026-06-28'), // June (out of July range)
  exp(6, 1, 5000, '2026-08-03'), // Aug (out of July range)
  exp(7, 1, 400, '2026-07-15', true), // VOID — must be excluded
]

describe('expensesInRange', () => {
  it('includes only non-void expenses within July', () => {
    const r = expensesInRange(EXPENSES, '2026-07-01', '2026-07-31')
    expect(r.map((e) => e.id).sort()).toEqual([1, 2, 3, 4])
  })
  it('boundary dates are inclusive', () => {
    expect(expensesInRange(EXPENSES, '2026-07-01', '2026-07-01').map((e) => e.id)).toEqual([4])
  })
  it('multi-month range', () => {
    const r = expensesInRange(EXPENSES, '2026-07-01', '2026-08-31')
    expect(r.map((e) => e.id).sort()).toEqual([1, 2, 3, 4, 6])
  })
})

describe('totalsByCategory + sumAmount', () => {
  const july = expensesInRange(EXPENSES, '2026-07-01', '2026-07-31')
  it('groups and sorts by amount desc', () => {
    expect(totalsByCategory(july)).toEqual([
      { categoryId: 1, amount: 5000 }, // 3000 + 2000
      { categoryId: 3, amount: 2500 },
      { categoryId: 2, amount: 1200 },
    ])
  })
  it('sum excludes void and out-of-range', () => {
    expect(sumAmount(july)).toBe(8700)
  })
})

describe('toCSV', () => {
  it('escapes commas, quotes, newlines', () => {
    const csv = toCSV(['a', 'b'], [['x,y', 'he said "hi"'], ['line1\nline2', 5]])
    expect(csv).toBe('a,b\r\n"x,y","he said ""hi"""\r\n"line1\nline2",5')
  })
  it('renders null/undefined as empty', () => {
    expect(toCSV(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })
})
