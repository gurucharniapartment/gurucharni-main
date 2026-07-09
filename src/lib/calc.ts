// ============================================================
// DUES CALCULATION ENGINE — rupee-ledger model (single source of truth).
// Pure functions only (no DB, no clock) so they are fully unit-testable.
//
// Model (see FLAT-DATA.md / SCOPE.md):
//   balance = opening_due
//           + Σ monthly-charge for each month from tracking-start..current
//           − Σ non-void payments (rupees)
//   balance > 0  → owes that many rupees
//   balance = 0  → clear (paid through current month)
//   balance < 0  → advance/credit (paid ahead)
// Void-safe: payments are just summed, so voiding one recomputes correctly.
// ============================================================
import type { FlatCharge, FlatType, FlatTypeHistory } from './types'
import { monthIndex } from './dates'

/** A flat's type (label) in effect at (or before) a given month. */
export function typeForMonth(
  history: FlatTypeHistory[],
  flatId: string,
  atMonthIdx: number,
): FlatType | null {
  let best: FlatType | null = null
  let bestIdx = -Infinity
  for (const h of history) {
    if (h.flat_id !== flatId) continue
    const idx = monthIndex(h.effective_from)
    if (idx <= atMonthIdx && idx > bestIdx) {
      best = h.type
      bestIdx = idx
    }
  }
  return best
}

export type FlatStatus = 'clear' | 'advance' | 'cooldown' | 'due' | 'unconfigured'

export interface DueResult {
  status: FlatStatus
  balance: number // signed: + owes, − credit
  dueAmount: number // max(balance, 0) = arrears + currentMonthDue
  arrears: number // owed from BEFORE the current month (excludes this month's charge)
  currentMonthDue: number // unpaid portion of the current month's charge
  advanceAmount: number // max(−balance, 0)
  paidThroughIdx: number | null // month index paid through (clear/advance)
  monthlyCharge: number // charge effective for the current month
}

/** The per-flat monthly charge in effect at (or before) a given month. */
export function chargeForMonth(
  charges: FlatCharge[],
  flatId: string,
  atMonthIdx: number,
): number {
  let best = 0
  let bestIdx = -Infinity
  for (const c of charges) {
    if (c.flat_id !== flatId) continue
    const idx = monthIndex(c.effective_from)
    if (idx <= atMonthIdx && idx > bestIdx) {
      best = c.amount
      bestIdx = idx
    }
  }
  return bestIdx === -Infinity ? NaN : best // NaN = no charge configured
}

/**
 * Compute a flat's dues position.
 *
 * @param openingDue   signed opening balance as of the start of tracking month
 * @param paidTotal    sum of non-void payment amounts (rupees) for this flat
 * @param cooldownDays grace window (inclusive); default 10
 */
export function computeDue(
  flatId: string,
  openingDue: number,
  paidTotal: number,
  charges: FlatCharge[],
  trackingStartIdx: number,
  currentMonthIdx: number,
  todayDay: number,
  cooldownDays = 10,
): DueResult {
  const currentCharge = chargeForMonth(charges, flatId, currentMonthIdx)

  if (Number.isNaN(currentCharge)) {
    return {
      status: 'unconfigured',
      balance: 0,
      dueAmount: 0,
      arrears: 0,
      currentMonthDue: 0,
      advanceAmount: 0,
      paidThroughIdx: null,
      monthlyCharge: 0,
    }
  }

  // Accrue each month at its own applicable charge (honors future rate changes).
  let accrued = 0
  for (let m = trackingStartIdx; m <= currentMonthIdx; m++) {
    const c = chargeForMonth(charges, flatId, m)
    if (!Number.isNaN(c)) accrued += c
  }

  const balance = openingDue + accrued - paidTotal

  if (balance <= 0) {
    const advanceAmount = -balance
    const monthsAhead = currentCharge > 0 ? Math.floor(advanceAmount / currentCharge) : 0
    return {
      status: advanceAmount === 0 ? 'clear' : 'advance',
      balance,
      dueAmount: 0,
      arrears: 0,
      currentMonthDue: 0,
      advanceAmount,
      paidThroughIdx: currentMonthIdx + monthsAhead,
      monthlyCharge: currentCharge,
    }
  }

  // Owes money. Split into arrears (before this month) + this month's unpaid charge.
  const currentMonthDue = Math.min(balance, currentCharge)
  const arrears = balance - currentMonthDue
  // Cooldown = only the current month's charge remains AND within grace.
  const status: FlatStatus = arrears <= 0 && todayDay <= cooldownDays ? 'cooldown' : 'due'

  return {
    status,
    balance,
    dueAmount: balance,
    arrears,
    currentMonthDue,
    advanceAmount: 0,
    paidThroughIdx: null,
    monthlyCharge: currentCharge,
  }
}

export interface PaymentPreview {
  amount: number // total ₹ of this payment
  newBalance: number // balance after applying the payment
  newAdvanceThroughIdx: number | null // if payment results in advance/clear
}

/**
 * Preview the effect of a payment. Provide EITHER months (× current charge)
 * or a direct amount. Returns the resulting balance and any advance-through month.
 */
export function computePaymentPreview(
  currentBalance: number,
  currentCharge: number,
  currentMonthIdx: number,
  opts: { months?: number; amount?: number },
): PaymentPreview {
  const amount =
    opts.amount != null ? opts.amount : Math.max(0, opts.months ?? 0) * currentCharge
  const newBalance = currentBalance - amount
  let newAdvanceThroughIdx: number | null = null
  if (newBalance <= 0) {
    const monthsAhead = currentCharge > 0 ? Math.floor(-newBalance / currentCharge) : 0
    newAdvanceThroughIdx = currentMonthIdx + monthsAhead
  }
  return { amount, newBalance, newAdvanceThroughIdx }
}

/** Effective recurring amount (e.g. watchman salary) at a month, honoring raises. */
export function recurringAmountForMonth(
  rows: { amount: number; effective_from: string; is_active: boolean }[],
  atMonthIdx: number,
): number {
  let best = 0
  let bestIdx = -Infinity
  for (const r of rows) {
    if (!r.is_active) continue
    const idx = monthIndex(r.effective_from)
    if (idx <= atMonthIdx && idx > bestIdx) {
      best = r.amount
      bestIdx = idx
    }
  }
  return best
}
