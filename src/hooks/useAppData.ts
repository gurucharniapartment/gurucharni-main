import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computeDue, type DueResult } from '@/lib/calc'
import { currentMonthIndex, makeMonthIndex, monthIndex, todayIST } from '@/lib/dates'
import type {
  AppSetting, Expense, ExpenseCategory, Flat, FlatCharge, FlatTypeHistory,
  Payment, Rate, RecurringExpense,
} from '@/lib/types'

const DEFAULT_TRACKING_START = '2026-07-01'

export interface AppData {
  flats: Flat[]
  charges: FlatCharge[]
  typeHistory: FlatTypeHistory[]
  rates: Rate[]
  payments: Payment[]
  categories: ExpenseCategory[]
  expenses: Expense[]
  recurring: RecurringExpense[]
  settings: Record<string, string>
}

export interface FlatWithDue extends Flat {
  due: DueResult
  paidTotal: number
}

export interface Computed {
  totalCollected: number
  totalSpent: number
  balance: number
  totalDues: number
  totalAdvance: number
  flatsWithDue: FlatWithDue[]
  trackingStartIdx: number
}

const empty: AppData = {
  flats: [], charges: [], typeHistory: [], rates: [], payments: [],
  categories: [], expenses: [], recurring: [], settings: {},
}

export function computeAggregates(data: AppData): Computed {
  const monthIdx = currentMonthIndex()
  const day = todayIST().day
  const trackingStartIdx = monthIndex(data.settings.tracking_start_month || DEFAULT_TRACKING_START)

  // One-time: July 2026 (launch month) grace runs to the 15th. Every other
  // month uses the standard 10-day cooldown.
  const cooldownDays = monthIdx === makeMonthIndex(2026, 7) ? 15 : 10

  const totalCollected = data.payments.filter((p) => !p.is_void).reduce((s, p) => s + p.amount, 0)
  const totalSpent = data.expenses.filter((e) => !e.is_void).reduce((s, e) => s + e.amount, 0)
  const openingFund = Number.parseInt(data.settings.opening_fund_balance || '0') || 0

  // Non-void payments per flat (rupees).
  const paidByFlat = new Map<string, number>()
  for (const p of data.payments) {
    if (p.is_void) continue
    paidByFlat.set(p.flat_id, (paidByFlat.get(p.flat_id) ?? 0) + p.amount)
  }

  const flatsWithDue: FlatWithDue[] = data.flats
    .filter((f) => f.is_active)
    .map((f) => {
      const paidTotal = paidByFlat.get(f.id) ?? 0
      return {
        ...f,
        paidTotal,
        due: computeDue(f.id, f.opening_due, paidTotal, data.charges, trackingStartIdx, monthIdx, day, cooldownDays),
      }
    })

  const totalDues = flatsWithDue.reduce((s, f) => s + f.due.dueAmount, 0)
  const totalAdvance = flatsWithDue.reduce((s, f) => s + f.due.advanceAmount, 0)

  return {
    totalCollected,
    totalSpent,
    balance: openingFund + totalCollected - totalSpent,
    totalDues,
    totalAdvance,
    flatsWithDue,
    trackingStartIdx,
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [flats, charges, typeHistory, rates, payments, categories, expenses, recurring, settings] =
        await Promise.all([
          supabase.from('flats').select('*').order('sort_order'),
          supabase.from('flat_charges').select('*'),
          supabase.from('flat_type_history').select('*'),
          supabase.from('rates').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('expense_categories').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('recurring_expenses').select('*'),
          supabase.from('app_settings').select('*'),
        ])

      const first = [flats, charges, typeHistory, rates, payments, categories, expenses, recurring, settings]
        .find((r) => r.error)
      if (first?.error) throw first.error

      const settingsMap: Record<string, string> = {}
      for (const s of (settings.data as AppSetting[]) ?? []) {
        if (s.value != null) settingsMap[s.key] = s.value
      }

      setData({
        flats: (flats.data as Flat[]) ?? [],
        charges: (charges.data as FlatCharge[]) ?? [],
        typeHistory: (typeHistory.data as FlatTypeHistory[]) ?? [],
        rates: (rates.data as Rate[]) ?? [],
        payments: (payments.data as Payment[]) ?? [],
        categories: (categories.data as ExpenseCategory[]) ?? [],
        expenses: (expenses.data as Expense[]) ?? [],
        recurring: (recurring.data as RecurringExpense[]) ?? [],
        settings: settingsMap,
      })
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('app-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flats' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flat_charges' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, computed: computeAggregates(data), loading, error, reload: load }
}
