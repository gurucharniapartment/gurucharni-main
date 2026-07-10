import { describe, it, expect } from 'vitest'
import { computeDue, computePaymentPreview, chargeForMonth } from './calc'
import { makeMonthIndex } from './dates'
import type { FlatCharge } from './types'

const JULY = makeMonthIndex(2026, 7)
const DEC = makeMonthIndex(2026, 12)

function charge(flatId: string, amount: number, from = '2026-07-01'): FlatCharge {
  return { id: 1, flat_id: flatId, amount, effective_from: from, created_at: '' }
}

// Charges for the real building.
const CHARGES: FlatCharge[] = [
  charge('G1', 400), charge('G2', 1250),
  charge('G3', 800), charge('G4', 800), charge('G5', 800), charge('G6', 800),
  charge('G7', 1250), charge('G8', 800), charge('G9', 800), charge('G10', 800),
  charge('G11', 800), charge('G12', 1250), charge('G13', 800), charge('G14', 800),
]

// computeDue(flatId, openingDue, paidTotal, charges, trackingStart, current, day)
const due = (id: string, opening: number, paid: number, day: number) =>
  computeDue(id, opening, paid, CHARGES, JULY, JULY, day)

describe('real building — as of 9 July (grace window)', () => {
  it('G1 half-rate, only July owed → cooldown ₹400', () => {
    const r = due('G1', 0, 0, 9)
    expect(r.dueAmount).toBe(400)
    expect(r.status).toBe('cooldown')
  })
  it('G2 rate ₹1,250, only July owed → cooldown ₹1,250', () => {
    expect(due('G2', 0, 0, 9)).toMatchObject({ dueAmount: 1250, status: 'cooldown' })
  })
  it('G3 arrears + July → due ₹5,600 (red even in grace)', () => {
    const r = due('G3', 4800, 0, 9)
    expect(r.dueAmount).toBe(5600)
    expect(r.status).toBe('due')
    expect(r.arrears).toBe(4800) // owed before this month
    expect(r.currentMonthDue).toBe(800) // this month's charge, separate
  })
  it('G12 tenant splits arrears 7,233 + this-month 1,250', () => {
    const r = due('G12', 7233, 0, 9)
    expect(r.arrears).toBe(7233)
    expect(r.currentMonthDue).toBe(1250)
  })
  it('grace flat has zero arrears (only this month owed)', () => {
    const r = due('G4', 0, 0, 9)
    expect(r.arrears).toBe(0)
    expect(r.currentMonthDue).toBe(800)
  })
  it('G4 nil + July → cooldown ₹800', () => {
    expect(due('G4', 0, 0, 9)).toMatchObject({ dueAmount: 800, status: 'cooldown' })
  })
  it('G7 tenant ₹1,250, only July → cooldown ₹1,250', () => {
    expect(due('G7', 0, 0, 9)).toMatchObject({ dueAmount: 1250, status: 'cooldown' })
  })
  it('G10 advance −4,800 + July → advance, paid through Dec 2026', () => {
    const r = due('G10', -4800, 0, 9)
    expect(r.status).toBe('advance')
    expect(r.balance).toBe(-4000)
    expect(r.advanceAmount).toBe(4000)
    expect(r.paidThroughIdx).toBe(DEC)
  })
  it('G11 arrears 4,800 + July → due ₹5,600', () => {
    expect(due('G11', 4800, 0, 9)).toMatchObject({ dueAmount: 5600, status: 'due' })
  })
  it('G12 tenant, odd arrears 7,233 + July 1,250 → due ₹8,483', () => {
    expect(due('G12', 7233, 0, 9)).toMatchObject({ dueAmount: 8483, status: 'due' })
  })
})

describe('grace boundary', () => {
  it('only-July flat is cooldown on the 10th', () => {
    expect(due('G4', 0, 0, 10).status).toBe('cooldown')
  })
  it('only-July flat flips to due on the 11th', () => {
    expect(due('G4', 0, 0, 11).status).toBe('due')
  })
  it('arrears flat is due even on the 9th (grace only covers current month)', () => {
    expect(due('G3', 4800, 0, 9).status).toBe('due')
  })
  it('small credit not covering current month → cooldown in grace, due after', () => {
    // opening −200 credit, +800 July = 600 owed, only current month partial
    expect(due('G4', -200, 0, 9).status).toBe('cooldown')
    expect(due('G4', -200, 0, 11).status).toBe('due')
  })
})

describe('payments clear and create advance', () => {
  it('paying exact July charge → clear, paid through July', () => {
    const r = due('G4', 0, 800, 9)
    expect(r.status).toBe('clear')
    expect(r.balance).toBe(0)
    expect(r.paidThroughIdx).toBe(JULY)
  })
  it('paying arrears fully clears G12', () => {
    const r = due('G12', 7233, 8483, 9) // pays the whole outstanding
    expect(r.status).toBe('clear')
    expect(r.dueAmount).toBe(0)
  })
  it('overpaying → advance months forward', () => {
    // July charge 800; pay 2400 → covers July + 2 ahead = paid through Sept
    const r = due('G4', 0, 2400, 9)
    expect(r.status).toBe('advance')
    expect(r.paidThroughIdx).toBe(makeMonthIndex(2026, 9))
  })
})

describe('future rate change (effective-dated charge)', () => {
  it('accrues each month at its own charge', () => {
    const charges: FlatCharge[] = [
      charge('X', 800, '2026-07-01'),
      charge('X', 1000, '2026-09-01'),
    ]
    // current = October: Jul800 + Aug800 + Sep1000 + Oct1000 = 3600
    const r = computeDue('X', 0, 0, charges, JULY, makeMonthIndex(2026, 10), 15)
    expect(r.dueAmount).toBe(3600)
    expect(r.monthlyCharge).toBe(1000)
  })
})

describe('unconfigured & helpers', () => {
  it('flat with no charge row → unconfigured', () => {
    expect(computeDue('ZZ', 0, 0, CHARGES, JULY, JULY, 9).status).toBe('unconfigured')
  })
  it('chargeForMonth picks latest effective', () => {
    const cs = [charge('X', 800, '2026-07-01'), charge('X', 1000, '2026-09-01')]
    expect(chargeForMonth(cs, 'X', makeMonthIndex(2026, 8))).toBe(800)
    expect(chargeForMonth(cs, 'X', makeMonthIndex(2026, 9))).toBe(1000)
  })
})

describe('computePaymentPreview', () => {
  it('by months', () => {
    const p = computePaymentPreview(5600, 800, JULY, { months: 7 })
    expect(p.amount).toBe(5600)
    expect(p.newBalance).toBe(0)
  })
  it('by direct amount → advance', () => {
    const p = computePaymentPreview(800, 800, JULY, { amount: 2400 })
    expect(p.newBalance).toBe(-1600)
    expect(p.newAdvanceThroughIdx).toBe(makeMonthIndex(2026, 9))
  })
})
