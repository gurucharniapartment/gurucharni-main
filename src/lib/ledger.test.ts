import { describe, it, expect } from 'vitest'
import { buildFlatLedger } from './ledger'
import { computeDue } from './calc'
import { makeMonthIndex } from './dates'
import type { FlatCharge, Payment } from './types'

const JULY = makeMonthIndex(2026, 7)
const SEP = makeMonthIndex(2026, 9)

const charges: FlatCharge[] = [{ id: 1, flat_id: 'G3', amount: 800, effective_from: '2026-07-01', created_at: '' }]

function pay(id: number, amount: number, date: string, is_void = false): Payment {
  return {
    id, flat_id: 'G3', payment_date: date, kind: 'maintenance', months_covered: 1, covered_months: null,
    amount, covers_from: null, covers_to: null, note: null, is_void, created_by: null, created_at: '',
  }
}

describe('buildFlatLedger', () => {
  it('opening + monthly charges + payments, running balance, void excluded', () => {
    // G3: opening 4800 due; Jul/Aug/Sep charges 800 each; one payment 800 (Jul), one voided
    const payments = [pay(1, 800, '2026-07-15'), pay(2, 400, '2026-08-01', true)]
    const led = buildFlatLedger({
      flatId: 'G3', openingDue: 4800, charges, payments, trackingStartIdx: JULY, currentMonthIdx: SEP,
    })
    // entries: opening(+4800), Jul charge(+800)=5600, payment(-800)=4800, Aug charge(+800)=5600, Sep charge(+800)=6400
    expect(led.map((e) => e.balance)).toEqual([4800, 5600, 4800, 5600, 6400])
    expect(led.find((e) => e.type === 'payment' && e.paymentId === 2)).toBeUndefined() // voided
  })

  it('final ledger balance always equals computeDue().balance', () => {
    const payments = [pay(1, 800, '2026-07-15')]
    const led = buildFlatLedger({
      flatId: 'G3', openingDue: 4800, charges, payments, trackingStartIdx: JULY, currentMonthIdx: SEP,
    })
    const finalLedgerBalance = led[led.length - 1].balance
    const due = computeDue('G3', 4800, 800, charges, JULY, SEP, 15)
    expect(finalLedgerBalance).toBe(due.balance)
  })

  it('advance opening (negative) shows as credit', () => {
    const led = buildFlatLedger({
      flatId: 'G3', openingDue: -1600, charges, payments: [], trackingStartIdx: JULY, currentMonthIdx: JULY,
    })
    expect(led[0]).toMatchObject({ type: 'opening', credit: 1600, debit: 0, balance: -1600 })
    expect(led[1].balance).toBe(-800) // + July charge 800
  })
})
