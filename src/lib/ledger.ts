// Builds a per-flat account statement: opening balance + each monthly
// maintenance charge (debit) + each payment (credit), with a running balance.
// Pure & unit-tested. Final running balance MUST equal computeDue().balance.
import type { FlatCharge, Payment } from './types'
import { chargeForMonth } from './calc'
import { monthIndexToISO } from './dates'

export interface LedgerEntry {
  date: string // 'YYYY-MM-DD'
  type: 'opening' | 'charge' | 'payment'
  debit: number // amount added to what's owed
  credit: number // amount paid
  balance: number // running balance after this entry (+ owes, − advance)
  monthIdx?: number // for 'charge'
  paymentId?: number // for 'payment'
  kind?: string // payment kind
  coversFrom?: string | null
  coversTo?: string | null
}

export function buildFlatLedger(opts: {
  flatId: string
  openingDue: number
  charges: FlatCharge[]
  payments: Payment[]
  trackingStartIdx: number
  currentMonthIdx: number
}): LedgerEntry[] {
  const { flatId, openingDue, charges, payments, trackingStartIdx, currentMonthIdx } = opts

  type Raw = Omit<LedgerEntry, 'balance'> & { rank: number }
  const raw: Raw[] = []

  if (openingDue !== 0) {
    raw.push({
      date: monthIndexToISO(trackingStartIdx),
      type: 'opening',
      debit: openingDue > 0 ? openingDue : 0,
      credit: openingDue < 0 ? -openingDue : 0,
      rank: 0,
    })
  }

  for (let m = trackingStartIdx; m <= currentMonthIdx; m++) {
    const amt = chargeForMonth(charges, flatId, m)
    if (!Number.isNaN(amt) && amt > 0) {
      raw.push({ date: monthIndexToISO(m), type: 'charge', debit: amt, credit: 0, monthIdx: m, rank: 1 })
    }
  }

  for (const p of payments) {
    if (p.is_void || p.flat_id !== flatId) continue
    raw.push({
      date: p.payment_date,
      type: 'payment',
      debit: 0,
      credit: p.amount,
      paymentId: p.id,
      kind: p.kind,
      coversFrom: p.covers_from,
      coversTo: p.covers_to,
      rank: 2,
    })
  }

  raw.sort((a, b) => a.date.localeCompare(b.date) || a.rank - b.rank || (a.paymentId ?? 0) - (b.paymentId ?? 0))

  let running = 0
  return raw.map((r) => {
    running += r.debit - r.credit
    const { rank: _rank, ...entry } = r
    return { ...entry, balance: running }
  })
}
