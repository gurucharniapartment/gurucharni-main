import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { formatRupees, cn, flatName } from '@/lib/utils'
import { currentMonthInput, monthIndexToISO, monthIndex, monthLabel } from '@/lib/dates'
import { expensesInRange, totalsByCategory, sumAmount } from '@/lib/reports'

// Muted, distinct palette for the pie slices.
const PALETTE = ['#4f7cc4', '#57b894', '#e0a458', '#c96b6b', '#8a7bc8', '#5bb3c4', '#c98bb0', '#9aa0a6']

export function Reports() {
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()
  const minMonth = monthIndexToISO(computed.trackingStartIdx).slice(0, 7)

  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'month' | 'range'>('month')
  const [view, setView] = useState<'out' | 'in'>(searchParams.get('view') === 'in' ? 'in' : 'out')
  const [month, setMonth] = useState(currentMonthInput())
  const [from, setFrom] = useState(minMonth)
  const [to, setTo] = useState(currentMonthInput())

  const fromMonth = mode === 'month' ? month : from
  const toMonth = mode === 'month' ? month : to
  const fromISO = `${fromMonth}-01`
  const toISO = `${toMonth}-31`

  const periodExpenses = expensesInRange(data.expenses, fromISO, toISO)
  const spent = sumAmount(periodExpenses)
  const periodPayments = data.payments
    .filter((p) => !p.is_void && p.payment_date >= fromISO && p.payment_date <= toISO)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
  const collected = periodPayments.reduce((s, p) => s + p.amount, 0)

  const payLabel = (p: (typeof periodPayments)[number]) =>
    p.kind === 'due_clear'
      ? t('pay_clear_dues')
      : p.covers_from && p.covers_to
        ? `${monthLabel(monthIndex(p.covers_from), lang)}–${monthLabel(monthIndex(p.covers_to), lang)}`
        : t('pay_maintenance')

  const catName = (id: number) => {
    const c = data.categories.find((x) => x.id === id)
    return c ? (lang === 'mr' ? c.name_mr : c.name_en) : '—'
  }
  const pieData = totalsByCategory(periodExpenses).map((r) => ({ name: catName(r.categoryId), value: r.amount }))

  const seg = (m: 'month' | 'range', label: string) => (
    <button type="button" onClick={() => setMode(m)}
      className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
        mode === m ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{label}</button>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <h2 className="text-[17px] font-semibold tracking-tight">{t('monthly_report')}</h2>
      </div>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex rounded-full bg-[var(--color-secondary)] p-0.5">
          {seg('month', t('select_month'))}
          {seg('range', t('custom_range'))}
        </div>
        {mode === 'month' ? (
          <Field label={t('select_month')}>
            <Input type="month" min={minMonth} value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('from')}><Input type="month" min={minMonth} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label={t('to')}><Input type="month" min={minMonth} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        )}
        <div className="mt-4 flex divide-x divide-[var(--color-border)] border-t border-[var(--color-border)] pt-3">
          <div className="flex-1 text-center">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('collected_this_period')}</div>
            <div className="mt-1 text-[17px] font-semibold tabular-nums text-[var(--color-status-clear)]">{formatRupees(collected)}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('spent_this_period')}</div>
            <div className="mt-1 text-[17px] font-semibold tabular-nums text-[var(--color-status-due)]">{formatRupees(spent)}</div>
          </div>
        </div>
      </Card>

      {/* Money In / Money Out toggle */}
      <div className="mb-4 flex rounded-full bg-[var(--color-secondary)] p-0.5">
        <button type="button" onClick={() => setView('in')}
          className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all', view === 'in' ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{t('money_in')}</button>
        <button type="button" onClick={() => setView('out')}
          className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all', view === 'out' ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{t('money_out')}</button>
      </div>

      {view === 'in' ? (
        <Card className="p-4">
          <h3 className="mb-2 text-[15px] font-semibold">{t('money_in')}</h3>
          {loading ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('loading')}</p>
          ) : periodPayments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_payments_period')}</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {periodPayments.map((p) => (
                <div key={p.id} className="flex items-baseline justify-between gap-2 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{flatName(data.flats.find((f) => f.id === p.flat_id), lang)}</span>
                    <span className="text-[var(--color-muted-foreground)]"> · {p.flat_id} · {p.payment_date} · {payLabel(p)}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-[var(--color-status-clear)]">+{formatRupees(p.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-[13px] font-semibold">
                <span>{t('total')}</span>
                <span className="tabular-nums text-[var(--color-status-clear)]">{formatRupees(collected)}</span>
              </div>
            </div>
          )}
        </Card>
      ) : (
      <Card className="p-4">
        <h3 className="mb-2 text-[15px] font-semibold">{t('where_spent')}</h3>
        {loading ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('loading')}</p>
        ) : periodExpenses.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_expenses_period')}</p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatRupees(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums">{formatRupees(d.value)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-[var(--color-border)] pt-3">
              <div className="space-y-1">
                {[...periodExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-[12px]">
                    <span className="min-w-0 truncate">
                      <span className="text-[var(--color-muted-foreground)]">{e.expense_date}</span> · {catName(e.category_id)}
                      <span className="text-[var(--color-muted-foreground)]"> · {e.remark}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatRupees(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
      )}
    </div>
  )
}
