// All admin writes go through here. Each logs to audit_log and throws on error
// so the UI can show a message. RLS guarantees only the authenticated admin
// can actually perform these.
import { supabase } from './supabase'
import { monthIndex, monthIndexToISO } from './dates'
import { recurringAmountForMonth } from './calc'
import type { Expense, RecurringExpense } from './types'

async function actor(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? null
}

async function audit(action: string, entity: string, entityId: string, details: unknown) {
  await supabase.from('audit_log').insert({
    actor: await actor(),
    action,
    entity,
    entity_id: entityId,
    details: details as never,
  })
}

function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error
  return res
}

/** Set a flat's signed opening balance (₹): positive = owes, negative = advance. */
export async function setFlatOpeningDue(flatId: string, openingDue: number) {
  check(await supabase.from('flats').update({ opening_due: openingDue }).eq('id', flatId))
  await audit('setup', 'flats', flatId, { opening_due: openingDue })
}

/** Set a flat's monthly charge (₹) effective from a given month. */
export async function setFlatCharge(flatId: string, amount: number, effectiveISO: string) {
  check(await supabase.from('flat_charges').insert({ flat_id: flatId, amount, effective_from: effectiveISO }))
  await audit('charge', 'flat_charges', flatId, { amount, effective_from: effectiveISO })
}

/** Record a flat's type change (label) effective from a given month. */
export async function setFlatType(flatId: string, type: string, effectiveISO: string) {
  check(await supabase.from('flat_type_history').insert({ flat_id: flatId, type, effective_from: effectiveISO }))
  await audit('type_change', 'flats', flatId, { type, effective_from: effectiveISO })
}

/**
 * Insert a payment row. Two kinds:
 *  - 'maintenance': paid for specific months (pass coveredMonthsISO, e.g. ['2026-07-01']).
 *  - 'due_clear':   pays down old arrears; no months.
 * The balance is derived (opening_due + accrual − Σ payments), so nothing else to update.
 */
export async function recordPayment(input: {
  flatId: string
  paymentDate: string
  amount: number
  kind: 'maintenance' | 'due_clear'
  coveredMonthsISO?: string[]
  note?: string
}) {
  const months = (input.coveredMonthsISO ?? []).slice().sort()
  const isMaint = input.kind === 'maintenance' && months.length > 0
  const res = check(
    await supabase
      .from('payments')
      .insert({
        flat_id: input.flatId,
        payment_date: input.paymentDate,
        kind: input.kind,
        amount: input.amount,
        months_covered: isMaint ? months.length : null,
        covered_months: isMaint ? months.map((m) => m.slice(0, 7)).join(', ') : null,
        covers_from: isMaint ? months[0] : null,
        covers_to: isMaint ? months[months.length - 1] : null,
        note: input.note ?? null,
        created_by: await actor(),
      })
      .select('id')
      .single(),
  )
  await audit('payment', 'payments', String(res.data!.id), input)
  return res.data!.id as number
}

export async function addExpense(input: {
  categoryId: number
  expenseDate: string
  amount: number
  remark: string
}) {
  const res = check(
    await supabase
      .from('expenses')
      .insert({
        category_id: input.categoryId,
        expense_date: input.expenseDate,
        amount: input.amount,
        remark: input.remark,
        created_by: await actor(),
      })
      .select('id')
      .single(),
  )
  await audit('expense', 'expenses', String(res.data!.id), input)
}

export async function voidPayment(id: number) {
  check(await supabase.from('payments').update({ is_void: true }).eq('id', id))
  await audit('void', 'payments', String(id), {})
}

export async function voidExpense(id: number) {
  check(await supabase.from('expenses').update({ is_void: true }).eq('id', id))
  await audit('void', 'expenses', String(id), {})
}

/** Permanently delete a mistaken entry (audited before removal). */
export async function deletePayment(id: number) {
  await audit('delete', 'payments', String(id), {})
  check(await supabase.from('payments').delete().eq('id', id))
}

export async function deleteExpense(id: number) {
  await audit('delete', 'expenses', String(id), {})
  check(await supabase.from('expenses').delete().eq('id', id))
}

/** Upsert a global app setting. */
export async function setSetting(key: string, value: string) {
  check(await supabase.from('app_settings').upsert({ key, value }))
  await audit('setting', 'app_settings', key, { value })
}

/**
 * Ensure a monthly auto-expense exists for each active recurring item
 * (e.g. watchman ₹2,500) for every month from its effective date up to the
 * current month. Idempotent — only inserts months that are missing.
 * Returns the number of entries generated. (Admin-only; RLS enforces it.)
 */
export async function ensureRecurringEntries(
  recurring: RecurringExpense[],
  expenses: Expense[],
  trackingStartIdx: number,
  currentMonthIdx: number,
): Promise<number> {
  // Group recurring rows by category (a category may have raise-history rows).
  const byCategory = new Map<number, RecurringExpense[]>()
  for (const r of recurring) {
    if (!r.is_active || r.category_id == null) continue
    const list = byCategory.get(r.category_id) ?? []
    list.push(r)
    byCategory.set(r.category_id, list)
  }

  const toInsert: Partial<Expense>[] = []
  const actorEmail = await actor()

  for (const [categoryId, rows] of byCategory) {
    const earliest = Math.min(...rows.map((r) => monthIndex(r.effective_from)))
    const startIdx = Math.max(earliest, trackingStartIdx)
    for (let m = startIdx; m <= currentMonthIdx; m++) {
      const amount = recurringAmountForMonth(rows, m)
      if (amount <= 0) continue
      const monthPrefix = monthIndexToISO(m).slice(0, 7)
      const already = expenses.some(
        (e) => e.is_auto && !e.is_void && e.category_id === categoryId && e.expense_date.slice(0, 7) === monthPrefix,
      )
      if (already) continue
      toInsert.push({
        category_id: categoryId,
        expense_date: monthIndexToISO(m),
        amount,
        remark: rows[0].name_en,
        is_auto: true,
        created_by: actorEmail,
      })
    }
  }

  if (toInsert.length === 0) return 0
  check(await supabase.from('expenses').insert(toInsert as never))
  await audit('auto_recurring', 'expenses', 'batch', { count: toInsert.length })
  return toInsert.length
}
