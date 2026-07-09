import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRupees, flatName } from '@/lib/utils'
import { currentMonthIndex, monthLabel } from '@/lib/dates'

export function Dues() {
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()

  const curIdx = currentMonthIndex()
  const curMonthLabel = monthLabel(curIdx, lang)

  const rows = computed.flatsWithDue
    .filter((f) => f.due.dueAmount > 0)
    .sort((a, b) => b.due.dueAmount - a.due.dueAmount)

  // Flats that owe nothing: paid up ('clear') or paid ahead ('advance').
  const clearedRows = computed.flatsWithDue
    .filter((f) => f.due.status === 'clear' || f.due.status === 'advance')
    .sort((a, b) => a.sort_order - b.sort_order)

  // Most recent non-void payment per flat (for the cleared table).
  const lastPaymentOf = (flatId: string) =>
    [...data.payments]
      .filter((p) => p.flat_id === flatId && !p.is_void)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]

  const totArrears = rows.reduce((s, f) => s + f.due.arrears, 0)
  const totMonth = rows.reduce((s, f) => s + f.due.currentMonthDue, 0)
  const totAll = rows.reduce((s, f) => s + f.due.dueAmount, 0)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <h2 className="text-[17px] font-semibold tracking-tight">{t('who_owes')}</h2>
      </div>

      <Card className="p-4">
        {loading ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('nobody_owes')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-2 font-medium">{t('col_name')}</th>
                  <th className="pb-2 pr-2 text-right font-medium">{t('pay_outstanding')} ({t('before_month')} {curMonthLabel})</th>
                  <th className="pb-2 pr-2 text-right font-medium">{curMonthLabel}</th>
                  <th className="pb-2 text-right font-medium">{t('total_now')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rows.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2 pr-2">
                      <Link to={`/flat/${f.id}`} className="font-medium hover:underline">{flatName(f, lang)}</Link>
                      <span className="ml-1 text-[11px] text-[var(--color-muted-foreground)]">{f.id}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-[var(--color-status-due)]">{f.due.arrears ? formatRupees(f.due.arrears) : '—'}</td>
                    <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">{f.due.currentMonthDue ? formatRupees(f.due.currentMonthDue) : '—'}</td>
                    <td className="whitespace-nowrap py-2 text-right font-semibold tabular-nums text-[var(--color-status-due)]">{formatRupees(f.due.dueAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                  <td className="py-2 pr-2">{t('total_now')}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatRupees(totArrears)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatRupees(totMonth)}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--color-status-due)]">{formatRupees(totAll)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Flats that have already cleared their dues (paid up or paid ahead). */}
      <h3 className="mb-3 mt-6 text-[15px] font-semibold tracking-tight">{t('cleared_title')}</h3>
      <Card className="p-4">
        {loading ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('loading')}</p>
        ) : clearedRows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_cleared')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-2 font-medium">{t('col_name')}</th>
                  <th className="pb-2 pr-2 font-medium">{t('status_col')}</th>
                  <th className="pb-2 text-right font-medium">{t('last_payment')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {clearedRows.map((f) => {
                  const lp = lastPaymentOf(f.id)
                  const status = f.due.status === 'advance' && f.due.paidThroughIdx != null
                    ? `${t('status_advance')} ${t('till')} ${monthLabel(f.due.paidThroughIdx, lang)}`
                    : t('status_clear')
                  return (
                    <tr key={f.id}>
                      <td className="py-2 pr-2">
                        <Link to={`/flat/${f.id}`} className="font-medium hover:underline">{flatName(f, lang)}</Link>
                        <span className="ml-1 text-[11px] text-[var(--color-muted-foreground)]">{f.id}</span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-[var(--color-status-clear)]">{status}</td>
                      <td className="whitespace-nowrap py-2 text-right tabular-nums text-[var(--color-muted-foreground)]">
                        {lp ? `${lp.payment_date} · ${formatRupees(lp.amount)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
