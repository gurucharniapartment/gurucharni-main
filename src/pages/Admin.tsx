import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings2, Plus, Wallet, Download, Landmark, Zap } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useAppData, type AppData, type Computed } from '@/hooks/useAppData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Input, Select, Field } from '@/components/ui/input'
import { formatRupees, cn } from '@/lib/utils'
import { typeForMonth } from '@/lib/calc'
import {
  currentMonthIndex, currentMonthInput, monthIndex, monthIndexToISO, monthInputToISO,
  monthLabel, todayISODate, todayIST,
} from '@/lib/dates'
import { toCSV, downloadCSV } from '@/lib/csv'
import {
  addExpense, recordPayment, setFlatCharge, setFlatOpeningDue,
  setFlatType, setSetting, voidExpense, voidPayment,
} from '@/lib/mutations'

function ErrorLine({ msg }: { msg: string | null }) {
  return msg ? <p className="text-[13px] text-[var(--color-destructive)]">{msg}</p> : null
}
const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

/* ---------------- Flat setup ---------------- */
function FlatSetupDialog({ data, computed, reload }: { data: AppData; computed: Computed; reload: () => void }) {
  const { t } = useI18n()
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
                {data.flats.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
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
                <option key={f.id} value={f.id}>{f.id} — {formatRupees(f.due.dueAmount)} {t('due_label')}</option>
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

/* ---------------- Recent lists ---------------- */
function RecentPayments({ data, reload }: { data: AppData; reload: () => void }) {
  const { t } = useI18n()
  const rows = [...data.payments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)
  async function doVoid(id: number) {
    if (!confirm(t('confirm_void'))) return
    try { await voidPayment(id); reload() } catch (e) { alert(msgOf(e)) }
  }
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-[15px] font-semibold">{t('recent_payments')}</h3>
      {rows.length === 0 && <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('no_records')}</p>}
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map((p) => (
          <div key={p.id} className={cn('flex items-center justify-between py-2 text-[13px]', p.is_void && 'opacity-40 line-through')}>
            <div className="min-w-0 flex-1 truncate pr-2">
              <span className="font-medium">{p.flat_id}</span>
              <span className="text-[var(--color-muted-foreground)]"> · {p.kind === 'due_clear' ? t('pay_clear_dues') : (p.covered_months || t('pay_maintenance'))}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums">{formatRupees(p.amount)}</span>
              {!p.is_void && <button onClick={() => doVoid(p.id)} className="text-[12px] text-[var(--color-destructive)]">{t('void')}</button>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RecentExpenses({ data, reload }: { data: AppData; reload: () => void }) {
  const { t, lang } = useI18n()
  const rows = [...data.expenses].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)
  const catName = (id: number) => {
    const c = data.categories.find((x) => x.id === id)
    return c ? (lang === 'mr' ? c.name_mr : c.name_en) : ''
  }
  async function doVoid(id: number) {
    if (!confirm(t('confirm_void'))) return
    try { await voidExpense(id); reload() } catch (e) { alert(msgOf(e)) }
  }
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-[15px] font-semibold">{t('recent_expenses')}</h3>
      {rows.length === 0 && <p className="text-[13px] text-[var(--color-muted-foreground)]">{t('no_records')}</p>}
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map((e) => (
          <div key={e.id} className={cn('flex items-center justify-between py-2 text-[13px]', e.is_void && 'opacity-40 line-through')}>
            <div className="min-w-0 flex-1 truncate pr-2"><span className="font-medium">{catName(e.category_id)}</span>
              <span className="text-[var(--color-muted-foreground)]"> · {e.remark}</span></div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums">{formatRupees(e.amount)}</span>
              {!e.is_void && <button onClick={() => doVoid(e.id)} className="text-[12px] text-[var(--color-destructive)]">{t('void')}</button>}
            </div>
          </div>
        ))}
      </div>
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
  const exportPayments = () => downloadCSV('payments.csv', toCSV(
    ['Flat', 'Date', 'Kind', 'Months', 'Amount', 'Note', 'Status'],
    data.payments.map((p) => [p.flat_id, p.payment_date, p.kind, p.covered_months ?? '', p.amount, p.note ?? '', p.is_void ? 'VOID' : 'ok']),
  ))
  const exportExpenses = () => downloadCSV('expenses.csv', toCSV(
    ['Date', 'Category', 'Amount', 'Remark', 'Auto', 'Status'],
    data.expenses.map((e) => [e.expense_date, catName(e.category_id), e.amount, e.remark, e.is_auto ? 'auto' : '', e.is_void ? 'VOID' : 'ok']),
  ))
  const exportFlats = () => downloadCSV('flats.csv', toCSV(
    ['Flat', 'Monthly charge', 'Status', 'Due', 'Advance'],
    computed.flatsWithDue.map((f) => [f.id, f.due.monthlyCharge, f.due.status, f.due.dueAmount, f.due.advanceAmount]),
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

export function Admin() {
  const { t } = useI18n()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { data, computed, reload } = useAppData()

  // Electricity reminder: current month has no electricity bill entered.
  const elecCat = data.categories.find((c) => c.name_en === 'Electricity bill')
  const curPrefix = monthIndexToISO(currentMonthIndex()).slice(0, 7)
  const showElecReminder =
    !!elecCat &&
    todayIST().day <= 10 &&
    !data.expenses.some((e) => !e.is_void && e.category_id === elecCat.id && e.expense_date.slice(0, 7) === curPrefix)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">{t('admin')}</h2>
          <p className="text-[13px] text-[var(--color-muted-foreground)]">
            {t('available_balance')}: <span className="font-medium text-[var(--color-foreground)]">{formatRupees(computed.balance)}</span>
            {' · '}{t('total_dues')}: <span className="font-medium text-[var(--color-status-due)]">{formatRupees(computed.totalDues)}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate('/') }}>
          <LogOut className="h-4 w-4" />{t('logout')}
        </Button>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <RecentPayments data={data} reload={reload} />
        <RecentExpenses data={data} reload={reload} />
      </div>

      <ExportSection data={data} computed={computed} />
    </div>
  )
}
