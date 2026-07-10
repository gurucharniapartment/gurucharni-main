import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Share2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatRupees, cn, flatName } from '@/lib/utils'
import { currentMonthInput, monthIndexToISO, monthIndex, monthLabel } from '@/lib/dates'
import { expensesInRange, totalsByCategory, sumAmount } from '@/lib/reports'

// Muted, distinct palette for the pie slices.
const PALETTE = ['#4f7cc4', '#57b894', '#e0a458', '#c96b6b', '#8a7bc8', '#5bb3c4', '#c98bb0', '#9aa0a6']

export function Reports() {
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()
  const { isAdmin } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
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

  const fromIdx = monthIndex(fromISO)
  const toIdx = monthIndex(`${toMonth}-01`)
  const periodLabel = mode === 'month'
    ? monthLabel(fromIdx, lang)
    : `${monthLabel(fromIdx, lang)} – ${monthLabel(toIdx, lang)}`

  // Render the active view (money in / money out) to a PNG and share it via the
  // Web Share API (WhatsApp etc.); fall back to a download where unsupported.
  async function shareImage() {
    const node = cardRef.current
    if (!node) return
    setSharing(true)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      const name = view === 'in' ? 'money-in' : 'money-out'
      const file = new File([blob], `${name}.png`, { type: 'image/png' })
      const title = view === 'in' ? t('money_in') : t('money_out')
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: `${title} · ${periodLabel}` })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl; a.download = `${name}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') console.error(e)
    } finally {
      setSharing(false)
    }
  }

  const seg = (m: 'month' | 'range', label: string) => (
    <button type="button" onClick={() => setMode(m)}
      className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
        mode === m ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{label}</button>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
          <h2 className="text-[17px] font-semibold tracking-tight">{t('monthly_report')}</h2>
        </div>
        {isAdmin && (
          <Button variant="secondary" size="sm" disabled={sharing} onClick={shareImage}>
            <Share2 className="h-4 w-4" />{t('share_image')}
          </Button>
        )}
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
            <Field label={t('from')}><Input type="month" min={minMonth} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} /></Field>
            <Field label={t('to')}><Input type="month" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
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

      <div ref={cardRef}>
      {view === 'in' ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold">{t('money_in')}</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-foreground)] px-3 py-1 text-[12px] font-bold tabular-nums text-[var(--color-card)]">{periodLabel} · {formatRupees(collected)}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8 text-[var(--color-muted-foreground)]"><Spinner size={22} /></div>
          ) : periodPayments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_payments_period')}</p>
          ) : (
            <table className="w-full table-fixed text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="w-[88px] pb-1 pr-2 font-medium">{t('col_date')}</th>
                  <th className="pb-1 pr-2 font-medium">{t('col_name')}</th>
                  <th className="w-[44px] pb-1 pr-2 font-medium">{t('flat')}</th>
                  <th className="pb-1 pr-2 font-medium">{t('covers')}</th>
                  <th className="w-[76px] pb-1 text-right font-medium">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {periodPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-[var(--color-muted-foreground)]">{p.payment_date}</td>
                    <td className="truncate py-1.5 pr-2 font-medium">{flatName(data.flats.find((f) => f.id === p.flat_id), lang)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-[var(--color-muted-foreground)]">{p.flat_id}</td>
                    <td className="truncate py-1.5 pr-2 text-[var(--color-muted-foreground)]">{payLabel(p)}</td>
                    <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-[var(--color-status-clear)]">{formatRupees(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                  <td className="py-1.5 pr-2" colSpan={4}>{t('total')}</td>
                  <td className="py-1.5 text-right tabular-nums text-[var(--color-status-clear)]">{formatRupees(collected)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      ) : (
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{t('where_spent')}</h3>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-foreground)] px-3 py-1 text-[12px] font-bold tabular-nums text-[var(--color-card)]">{periodLabel} · {formatRupees(spent)}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8 text-[var(--color-muted-foreground)]"><Spinner size={22} /></div>
        ) : periodExpenses.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_expenses_period')}</p>
        ) : (
          <>
            {/* Small pie on the left, legend on the right — compact. */}
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={60} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatRupees(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatRupees(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense detail as a fitted, non-overflowing table. */}
            <div className="mt-4 border-t border-[var(--color-border)] pt-3">
              <table className="w-full table-fixed text-[12px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <th className="w-24 pb-1 pr-2 font-medium">{t('col_date')}</th>
                    <th className="pb-1 pr-2 font-medium">{t('category')}</th>
                    <th className="w-20 pb-1 text-right font-medium">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {[...periodExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e) => {
                    const cat = catName(e.category_id)
                    return (
                      <tr key={e.id} className="align-top">
                        <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-[var(--color-muted-foreground)]">{e.expense_date}</td>
                        <td className="py-1.5 pr-2">
                          <div className="break-words">{cat}</div>
                          {e.remark && e.remark !== cat && (
                            <div className="break-words text-[11px] text-[var(--color-muted-foreground)]">{e.remark}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{formatRupees(e.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      )}
      </div>
    </div>
  )
}
