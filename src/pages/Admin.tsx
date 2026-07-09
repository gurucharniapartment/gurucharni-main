import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings2, Plus, Wallet, Download, Landmark, Zap, MessageCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useAppData, type AppData, type Computed } from '@/hooks/useAppData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Input, Select, Field } from '@/components/ui/input'
import { formatRupees, cn, flatName, flatLabel } from '@/lib/utils'
import { typeForMonth } from '@/lib/calc'
import {
  currentMonthIndex, currentMonthInput, monthIndex, monthIndexToISO, monthInputToISO,
  monthLabel, todayISODate, todayIST,
} from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { toCSV, downloadCSV } from '@/lib/csv'
import { monthlyTotals } from '@/lib/reports'
import {
  addExpense, deleteExpense, deletePayment, recordPayment, setFlatCharge, setFlatOpeningDue,
  setFlatType, setSetting, voidExpense, voidPayment,
} from '@/lib/mutations'

function ErrorLine({ msg }: { msg: string | null }) {
  return msg ? <p className="text-[13px] text-[var(--color-destructive)]">{msg}</p> : null
}
const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

/* ---------------- Flat setup ---------------- */
function FlatSetupDialog({ data, computed, reload }: { data: AppData; computed: Computed; reload: () => void }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [flatId, setFlatId] = useState('G1')
  const [charge, setCharge] = useState('800')
  const [type, setType] = useState('residential')
  const [mode, setMode] = useState<'clear' | 'due' | 'advance'>('clear')
  const [dueAmt, setDueAmt] = useState('')
  const [advMonth, setAdvMonth] = useState(currentMonthInput())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const fwd = computed.flatsWithDue.find((f) => f.id === flatId)
  const currentType = typeForMonth(data.typeHistory, flatId, currentMonthIndex()) ?? 'residential'

  useEffect(() => {
    if (!open) return
    const opening = fwd?.opening_due ?? 0
    const ch = fwd?.due.monthlyCharge || 800
    setCharge(String(ch))
    setType(currentType)
    if (opening > 0) { setMode('due'); setDueAmt(String(opening)) }
    else if (opening < 0) {
      setMode('advance')
      const monthsCredit = ch > 0 ? Math.round(-opening / ch) : 0
      setAdvMonth(monthIndexToISO(computed.trackingStartIdx + monthsCredit - 1).slice(0, 7))
    } else { setMode('clear'); setDueAmt('') }
  }, [flatId, open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true); setErr(null)
    try {
      const ch = Number.parseInt(charge)
      if (!ch || ch <= 0) throw new Error('Enter a valid monthly charge')

      let opening = 0
      if (mode === 'due') opening = Number.parseInt(dueAmt) || 0
      else if (mode === 'advance') {
        const monthsAhead = monthIndex(monthInputToISO(advMonth)) - computed.trackingStartIdx + 1
        opening = -Math.max(0, monthsAhead) * ch
      }

      await setFlatOpeningDue(flatId, opening)

      // Charge row: effective from tracking start if none exists yet, else current month.
      const hasCharge = data.charges.some((c) => c.flat_id === flatId)
      if (ch !== (fwd?.due.monthlyCharge ?? 0)) {
        await setFlatCharge(flatId, ch, monthIndexToISO(hasCharge ? currentMonthIndex() : computed.trackingStartIdx))
      }
      if (type !== currentType) await setFlatType(flatId, type, monthIndexToISO(currentMonthIndex()))

      reload(); setOpen(false)
    } catch (e) { setErr(msgOf(e)) } finally { setBusy(false) }
  }

  const seg = (m: typeof mode, label: string) => (
    <button
      type="button" onClick={() => setMode(m)}
      className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
        mode === m ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}
    >{label}</button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Settings2 className="h-4 w-4" />{t('flat_setup')}</Button>
      </DialogTrigger>
      <DialogContent title={t('flat_setup')}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('select_flat')}>
              <Select value={flatId} onChange={(e) => setFlatId(e.target.value)}>
                {data.flats.map((f) => <option key={f.id} value={f.id}>{flatLabel(f, lang)}</option>)}
              </Select>
            </Field>
            <Field label={t('monthly_charge')}>
              <Input type="number" min={1} value={charge} onChange={(e) => setCharge(e.target.value)} />
            </Field>
          </div>
          <Field label={t('flat_type_label')}>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="residential">{t('residential')}</option>
              <option value="tenant_occupied">{t('tenant_occupied')}</option>
            </Select>
          </Field>

          <div>
            <div className="mb-1 text-[13px] font-medium">{t('opening_position')}</div>
            <div className="flex rounded-full bg-[var(--color-secondary)] p-0.5">
              {seg('clear', t('status_clear'))}
              {seg('due', t('status_due'))}
              {seg('advance', t('status_advance'))}
            </div>
          </div>
          {mode === 'due' && (
            <Field label={t('opening_due_amount')}>
              <Input type="number" min={0} value={dueAmt} onChange={(e) => setDueAmt(e.target.value)} placeholder="₹" />
            </Field>
          )}
          {mode === 'advance' && (
            <Field label={t('advance_through')}>
              <Input type="month" value={advMonth} onChange={(e) => setAdvMonth(e.target.value)} />
            </Field>
          )}

          <ErrorLine msg={err} />
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild><Button variant="ghost" size="sm">{t('cancel')}</Button></DialogClose>
            <Button size="sm" disabled={busy} onClick={save}>{busy ? t('loading') : t('save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Record payment ---------------- */
function PaymentDialog({ computed, reload }: { computed: Computed; reload: () => void }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [flatId, setFlatId] = useState('G1')
  const [kind, setKind] = useState<'maintenance' | 'due_clear'>('maintenance')
  const [fromM, setFromM] = useState(currentMonthInput())
  const [toM, setToM] = useState(currentMonthInput())
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISODate())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const fwd = computed.flatsWithDue.find((f) => f.id === flatId)
  const balance = fwd?.due.balance ?? 0
  const charge = fwd?.due.monthlyCharge ?? 0
  const dueAmount = fwd?.due.dueAmount ?? 0

  // Month range July 2026 → up to Dec 2035.
  const minMonth = monthIndexToISO(computed.trackingStartIdx).slice(0, 7)
  const fromIdx = monthIndex(monthInputToISO(fromM))
  const toIdx = monthIndex(monthInputToISO(toM))
  const coveredIdxs: number[] = []
  for (let m = fromIdx; m <= toIdx; m++) coveredIdxs.push(m)
  const monthCount = coveredIdxs.length
  const suggested = kind === 'maintenance' ? monthCount * charge : dueAmount
  const amt = Number.parseInt(amount) || 0
  const newBalance = balance - amt

  async function save() {
    setBusy(true); setErr(null)
    try {
      if (amt <= 0) throw new Error('Enter a valid amount')
      if (kind === 'maintenance' && monthCount <= 0) throw new Error('Choose a valid month range')
      await recordPayment({
        flatId, paymentDate: date, amount: amt, kind,
        coveredMonthsISO: kind === 'maintenance' ? coveredIdxs.map(monthIndexToISO) : undefined,
        note: note.trim() || undefined,
      })
      reload(); setOpen(false); setFromM(currentMonthInput()); setToM(currentMonthInput()); setAmount(''); setNote('')
    } catch (e) { setErr(msgOf(e)) } finally { setBusy(false) }
  }

  let after: string
  if (newBalance > 0) after = `${formatRupees(newBalance)} ${t('due_label')}`
  else if (newBalance === 0) after = t('status_clear')
  else after = `${formatRupees(-newBalance)} ${t('advance_short')}`

  const kindBtn = (k: typeof kind, label: string) => (
    <button type="button" onClick={() => setKind(k)}
      className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
        kind === k ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{label}</button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Wallet className="h-4 w-4" />{t('record_payment')}</Button>
      </DialogTrigger>
      <DialogContent title={t('record_payment')}>
        <div className="space-y-3">
          <div className="flex rounded-full bg-[var(--color-secondary)] p-0.5">
            {kindBtn('maintenance', t('pay_maintenance'))}
            {kindBtn('due_clear', t('pay_clear_dues'))}
          </div>

          <Field label={t('select_flat')}>
            <Select value={flatId} onChange={(e) => setFlatId(e.target.value)}>
              {computed.flatsWithDue.map((f) => (
                <option key={f.id} value={f.id}>{flatLabel(f, lang)} — {formatRupees(f.due.dueAmount)} {t('due_label')}</option>
              ))}
            </Select>
          </Field>

          {kind === 'maintenance' && (
            <div>
              <div className="mb-1.5 text-[13px] font-medium">{t('for_months')}</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('from')}>
                  <Input type="month" min={minMonth} max="2035-12" value={fromM}
                    onChange={(e) => { setFromM(e.target.value); if (e.target.value > toM) setToM(e.target.value) }} />
                </Field>
                <Field label={t('to')}>
                  <Input type="month" min={fromM} max="2035-12" value={toM} onChange={(e) => setToM(e.target.value)} />
                </Field>
              </div>
              {monthCount > 0 && (
                <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                  {monthCount} {t('months')} · {monthLabel(fromIdx, lang)} – {monthLabel(toIdx, lang)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label={t('amount')}>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t('date')}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          {suggested > 0 && (
            <button type="button" onClick={() => setAmount(String(suggested))} className="text-[12px] font-medium text-[var(--color-primary)]">
              {t('use_suggested')}: {formatRupees(suggested)}
            </button>
          )}
          <Field label={t('note')}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="rounded-[var(--radius-md)] bg-[var(--color-muted)] p-3 text-[13px]">
            <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">{t('current_balance')}</span>
              <span>{balance > 0 ? `${formatRupees(balance)} ${t('due_label')}` : `${formatRupees(-balance)} ${t('advance_short')}`}</span></div>
            <div className="mt-1 flex justify-between font-medium"><span className="text-[var(--color-muted-foreground)]">{t('after_payment')}</span>
              <span>{after}</span></div>
          </div>

          <ErrorLine msg={err} />
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild><Button variant="ghost" size="sm">{t('cancel')}</Button></DialogClose>
            <Button size="sm" disabled={busy} onClick={save}>{busy ? t('loading') : t('save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Add expense ---------------- */
function ExpenseDialog({ data, reload }: { data: AppData; reload: () => void }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const cats = data.categories.filter((c) => c.is_active)
  const [categoryId, setCategoryId] = useState<number>(cats[0]?.id ?? 0)
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [date, setDate] = useState(todayISODate())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Watchman salary is fixed ₹2,500 — pre-fill (still editable) when selected.
  useEffect(() => {
    if (cats.find((c) => c.id === categoryId)?.name_en === 'Watchman salary') setAmount('2500')
  }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true); setErr(null)
    try {
      const amt = Number.parseInt(amount)
      if (!amt || amt <= 0) throw new Error('Enter a valid amount')
      if (!remark.trim()) throw new Error('Remark is required')
      await addExpense({ categoryId: categoryId || cats[0]?.id, expenseDate: date, amount: amt, remark: remark.trim() })
      reload(); setOpen(false); setAmount(''); setRemark('')
    } catch (e) { setErr(msgOf(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Plus className="h-4 w-4" />{t('add_expense')}</Button>
      </DialogTrigger>
      <DialogContent title={t('add_expense')}>
        <div className="space-y-3">
          <Field label={t('category')}>
            <Select value={categoryId} onChange={(e) => setCategoryId(Number.parseInt(e.target.value))}>
              {cats.map((c) => <option key={c.id} value={c.id}>{lang === 'mr' ? c.name_mr : c.name_en}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('amount')}>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t('date')}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label={t('remark')}>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Field>
          <ErrorLine msg={err} />
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild><Button variant="ghost" size="sm">{t('cancel')}</Button></DialogClose>
            <Button size="sm" disabled={busy} onClick={save}>{busy ? t('loading') : t('save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Summary strip ---------------- */
function SummaryStrip({ data, computed }: { data: AppData; computed: Computed }) {
  const { t } = useI18n()
  const inAmt = data.payments.filter((p) => !p.is_void).reduce((s, p) => s + p.amount, 0)
  const outAmt = data.expenses.filter((e) => !e.is_void).reduce((s, e) => s + e.amount, 0)
  const cells: { label: string; value: string; cls: string }[] = [
    { label: t('available_balance'), value: formatRupees(computed.balance), cls: 'text-[var(--color-status-clear)]' },
    { label: t('money_in'), value: formatRupees(inAmt), cls: 'text-[var(--color-status-clear)]' },
    { label: t('money_out'), value: formatRupees(outAmt), cls: 'text-[var(--color-status-due)]' },
    { label: t('total_dues'), value: formatRupees(computed.totalDues), cls: 'text-[var(--color-status-due)]' },
  ]
  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {cells.map((c) => (
        <Card key={c.label} className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{c.label}</div>
          <div className={cn('mt-1 text-[17px] font-semibold tabular-nums display-tight', c.cls)}>{c.value}</div>
        </Card>
      ))}
    </div>
  )
}

/* ---------------- By-month table ---------------- */
function MonthlyTable({ data, computed }: { data: AppData; computed: Computed }) {
  const { t, lang } = useI18n()
  const rows = monthlyTotals(data.payments, data.expenses, computed.trackingStartIdx, currentMonthIndex())
    .filter((r) => r.inAmt > 0 || r.outAmt > 0)
  return (
    <Card className="mb-4 p-4">
      <h3 className="mb-3 text-[15px] font-semibold">{t('by_month')}</h3>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('no_records')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="pb-2 font-medium">{t('month_col')}</th>
                <th className="pb-2 text-right font-medium">{t('money_in')}</th>
                <th className="pb-2 text-right font-medium">{t('money_out')}</th>
                <th className="pb-2 text-right font-medium">{t('net')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => {
                const net = r.inAmt - r.outAmt
                return (
                  <tr key={r.monthIdx}>
                    <td className="whitespace-nowrap py-2 pr-3">{monthLabel(r.monthIdx, lang)}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--color-status-clear)]">{r.inAmt ? formatRupees(r.inAmt) : '—'}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--color-status-due)]">{r.outAmt ? formatRupees(r.outAmt) : '—'}</td>
                    <td className={cn('py-2 text-right font-medium tabular-nums', net >= 0 ? 'text-[var(--color-status-clear)]' : 'text-[var(--color-status-due)]')}>
                      {net >= 0 ? '+' : '−'}{formatRupees(Math.abs(net))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ---------------- Transactions (in green / out red) with void + delete ---------------- */
interface Txn {
  key: string
  kind: 'in' | 'out'
  id: number
  entity: 'payments' | 'expenses'
  monthIdx: number
  date: string
  title: string
  detail: string
  amount: number
  is_void: boolean
}

function Transactions({ data, reload }: { data: AppData; reload: () => void }) {
  const { t, lang } = useI18n()
  const [month, setMonth] = useState<string>('all')

  const catName = (id: number) => {
    const c = data.categories.find((x) => x.id === id)
    return c ? (lang === 'mr' ? c.name_mr : c.name_en) : ''
  }
  const payLabel = (p: typeof data.payments[number]) =>
    p.kind === 'due_clear'
      ? t('dues_cleared')
      : p.covers_from && p.covers_to
        ? `${monthLabel(monthIndex(p.covers_from), lang)}–${monthLabel(monthIndex(p.covers_to), lang)}`
        : t('pay_maintenance')

  const txns: Txn[] = [
    ...data.payments.map((p) => ({
      key: `p${p.id}`, kind: 'in' as const, id: p.id, entity: 'payments' as const,
      monthIdx: monthIndex(p.payment_date), date: p.payment_date,
      title: flatName(data.flats.find((f) => f.id === p.flat_id), lang), detail: `${p.flat_id} · ${payLabel(p)}`, amount: p.amount, is_void: p.is_void,
    })),
    ...data.expenses.map((e) => ({
      key: `e${e.id}`, kind: 'out' as const, id: e.id, entity: 'expenses' as const,
      monthIdx: monthIndex(e.expense_date), date: e.expense_date,
      title: catName(e.category_id), detail: e.remark, amount: e.amount, is_void: e.is_void,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const months = [...new Set(txns.map((x) => x.monthIdx))].sort((a, b) => b - a)
  const shown = month === 'all' ? txns : txns.filter((x) => String(x.monthIdx) === month)

  async function doVoid(x: Txn) {
    if (!confirm(t('confirm_void'))) return
    try { x.entity === 'payments' ? await voidPayment(x.id) : await voidExpense(x.id); reload() } catch (e) { alert(msgOf(e)) }
  }
  async function doDelete(x: Txn) {
    if (!confirm(t('confirm_delete'))) return
    try { x.entity === 'payments' ? await deletePayment(x.id) : await deleteExpense(x.id); reload() } catch (e) { alert(msgOf(e)) }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{t('transactions')}</h3>
        <Select className="h-8 w-auto py-0 text-[13px]" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">{t('all_months')}</option>
          {months.map((m) => <option key={m} value={String(m)}>{monthLabel(m, lang)}</option>)}
        </Select>
      </div>
      {shown.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('no_transactions')}</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {shown.map((x) => (
            <div key={x.key} className={cn('py-2.5', x.is_void && 'opacity-40')}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('min-w-0 flex-1 truncate text-[14px] font-medium', x.is_void && 'line-through')}>{x.title}</span>
                <span className={cn('shrink-0 text-[14px] font-semibold tabular-nums', x.kind === 'in' ? 'text-[var(--color-status-clear)]' : 'text-[var(--color-status-due)]', x.is_void && 'line-through')}>
                  {x.kind === 'in' ? '+' : '−'}{formatRupees(x.amount)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-[var(--color-muted-foreground)]">
                <span className="min-w-0 flex-1 truncate">{x.date} · {x.detail}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {!x.is_void && <button onClick={() => doVoid(x)} className="text-[var(--color-muted-foreground)] hover:underline">{t('void')}</button>}
                  <button onClick={() => doDelete(x)} className="text-[var(--color-destructive)] hover:underline">{t('delete')}</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ---------------- Bank opening balance ---------------- */
function BankBalanceDialog({ data, reload }: { data: AppData; reload: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (open) setAmount(data.settings.opening_fund_balance || '0') }, [open]) // eslint-disable-line

  async function save() {
    setBusy(true); setErr(null)
    try {
      const amt = Number.parseInt(amount)
      if (Number.isNaN(amt)) throw new Error('Enter a valid amount')
      await setSetting('opening_fund_balance', String(amt))
      reload(); setOpen(false)
    } catch (e) { setErr(msgOf(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Landmark className="h-4 w-4" />{t('set_bank_balance')}</Button>
      </DialogTrigger>
      <DialogContent title={t('bank_opening')}>
        <div className="space-y-3">
          <Field label={t('bank_opening')}>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <ErrorLine msg={err} />
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild><Button variant="ghost" size="sm">{t('cancel')}</Button></DialogClose>
            <Button size="sm" disabled={busy} onClick={save}>{busy ? t('loading') : t('save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- CSV export ---------------- */
function ExportSection({ data, computed }: { data: AppData; computed: Computed }) {
  const { t, lang } = useI18n()
  const catName = (id: number) => {
    const c = data.categories.find((x) => x.id === id)
    return c ? (lang === 'mr' ? c.name_mr : c.name_en) : ''
  }
  const nameOf = (id: string) => flatName(data.flats.find((f) => f.id === id), lang)
  const exportPayments = () => downloadCSV('payments.csv', toCSV(
    ['Flat', 'Name', 'Date', 'Kind', 'Months', 'Amount', 'Note', 'Status'],
    data.payments.map((p) => [p.flat_id, nameOf(p.flat_id), p.payment_date, p.kind, p.covered_months ?? '', p.amount, p.note ?? '', p.is_void ? 'VOID' : 'ok']),
  ))
  const exportExpenses = () => downloadCSV('expenses.csv', toCSV(
    ['Date', 'Category', 'Amount', 'Remark', 'Auto', 'Status'],
    data.expenses.map((e) => [e.expense_date, catName(e.category_id), e.amount, e.remark, e.is_auto ? 'auto' : '', e.is_void ? 'VOID' : 'ok']),
  ))
  const exportFlats = () => downloadCSV('flats.csv', toCSV(
    ['Flat', 'Name', 'Monthly charge', 'Status', 'Due', 'Advance'],
    computed.flatsWithDue.map((f) => [f.id, flatName(f, lang), f.due.monthlyCharge, f.due.status, f.due.dueAmount, f.due.advanceAmount]),
  ))
  return (
    <Card className="mt-4 p-4">
      <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('export_csv')}</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportPayments}><Download className="h-4 w-4" />{t('export_payments')}</Button>
        <Button variant="outline" size="sm" onClick={exportExpenses}><Download className="h-4 w-4" />{t('export_expenses')}</Button>
        <Button variant="outline" size="sm" onClick={exportFlats}><Download className="h-4 w-4" />{t('export_flats')}</Button>
      </div>
    </Card>
  )
}

/* ---------------- Activity (audit) log ---------------- */
interface AuditRow {
  id: number; actor: string | null; action: string; entity: string; entity_id: string | null; created_at: string
}
function AuditLog() {
  const { t } = useI18n()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setRows((data as AuditRow[]) ?? []); setLoading(false) })
  }, [])
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <Card className="mt-4 p-4">
      <h3 className="mb-3 text-[15px] font-semibold">{t('activity_log')}</h3>
      {loading ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('no_records')}</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-baseline justify-between gap-2 py-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium capitalize">{r.action}</span>
                <span className="text-[var(--color-muted-foreground)]"> · {r.entity}{r.entity_id ? ` #${r.entity_id}` : ''}{r.actor ? ` · ${r.actor}` : ''}</span>
              </span>
              <span className="shrink-0 text-[12px] text-[var(--color-muted-foreground)]">{when(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function Admin() {
  const { t } = useI18n()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { data, computed, reload } = useAppData()

  // Build the "pending maintenance list" and open WhatsApp to post to a group.
  function sharePendingList() {
    const cur = currentMonthIndex()
    const curMonth = monthLabel(cur, 'en')
    const lines = [...computed.flatsWithDue].sort((a, b) => a.sort_order - b.sort_order).map((f) => {
      const name = flatName(f, 'en').toUpperCase()
      const s = f.due
      let st: string
      if (s.status === 'advance') st = `Advance till ${monthLabel(s.paidThroughIdx!, 'en')}`
      else if (s.status === 'clear') st = 'Paid ✅'
      else if (s.status === 'cooldown') st = `*${formatRupees(s.currentMonthDue)}* (${curMonth})`
      else if (s.status === 'due') st = s.arrears > 0
        ? `*${formatRupees(s.arrears)} overdue* + ${formatRupees(s.currentMonthDue)} (${curMonth})`
        : `*${formatRupees(s.currentMonthDue)} overdue*`
      else st = '—'
      return `${f.sort_order}. ${name} = ${st}`
    })
    const base = window.location.href.split('#')[0]
    const msg =
      `*PENDING MAINTENANCE LIST*\n_as on ${todayIST().day} ${curMonth}_\n\n` +
      lines.join('\n') +
      `\n\nTotal pending: *${formatRupees(computed.totalDues)}*\n\n` +
      `Pay online (choose your flat):\n${base}#/pay`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // Electricity reminder: current month has no electricity bill entered.
  const elecCat = data.categories.find((c) => c.name_en === 'Electricity bill')
  const curPrefix = monthIndexToISO(currentMonthIndex()).slice(0, 7)
  const showElecReminder =
    !!elecCat &&
    todayIST().day <= 10 &&
    !data.expenses.some((e) => !e.is_void && e.category_id === elecCat.id && e.expense_date.slice(0, 7) === curPrefix)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight">{t('admin')}</h2>
        <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate('/') }}>
          <LogOut className="h-4 w-4" />{t('logout')}
        </Button>
      </div>

      <SummaryStrip data={data} computed={computed} />

      {showElecReminder && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-status-cooldown)]/30 bg-[var(--color-status-cooldown-bg)] px-3 py-2.5 text-[13px] text-[var(--color-status-cooldown)]">
          <Zap className="h-4 w-4 shrink-0" />
          <span>{t('electricity_reminder')}</span>
        </div>
      )}

      <Card className="mb-5 p-4">
        <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('quick_actions')}</h3>
        <div className="flex flex-wrap gap-2">
          <PaymentDialog computed={computed} reload={reload} />
          <ExpenseDialog data={data} reload={reload} />
          <FlatSetupDialog data={data} computed={computed} reload={reload} />
          <BankBalanceDialog data={data} reload={reload} />
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('whatsapp')}</h3>
        <button
          onClick={sharePendingList}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" />{t('share_pending_list')}
        </button>
        <p className="mt-2 text-[12px] text-[var(--color-muted-foreground)]">{t('share_pending_hint')}</p>
      </Card>

      <MonthlyTable data={data} computed={computed} />
      <Transactions data={data} reload={reload} />

      <ExportSection data={data} computed={computed} />
      <AuditLog />
    </div>
  )
}
