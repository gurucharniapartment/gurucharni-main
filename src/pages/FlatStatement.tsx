import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Printer } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRupees, cn } from '@/lib/utils'
import { currentMonthIndex, monthLabel, monthIndex } from '@/lib/dates'
import { typeForMonth } from '@/lib/calc'
import { buildFlatLedger } from '@/lib/ledger'

export function FlatStatement() {
  const { id = '' } = useParams()
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()

  const flat = data.flats.find((f) => f.id === id)
  const fwd = computed.flatsWithDue.find((f) => f.id === id)
  const curIdx = currentMonthIndex()

  if (loading) return <div className="py-24 text-center text-[var(--color-muted-foreground)]">{t('loading')}</div>
  if (!flat || !fwd) return <div className="py-24 text-center text-[var(--color-muted-foreground)]">—</div>

  const type = typeForMonth(data.typeHistory, id, curIdx) ?? 'residential'
  const ledger = buildFlatLedger({
    flatId: id, openingDue: flat.opening_due, charges: data.charges,
    payments: data.payments, trackingStartIdx: computed.trackingStartIdx, currentMonthIdx: curIdx,
  })
  const s = fwd.due
  const STATUS_META: Record<string, { label: string; cls: string }> = {
    advance: { label: t('st_advance'), cls: 'text-[var(--color-status-clear)]' },
    clear: { label: t('st_paid_up'), cls: 'text-[var(--color-status-clear)]' },
    cooldown: { label: t('st_grace'), cls: 'text-[var(--color-status-cooldown)]' },
    due: { label: t('st_overdue'), cls: 'text-[var(--color-status-due)]' },
    unconfigured: { label: t('status_unconfigured'), cls: 'text-[var(--color-muted-foreground)]' },
  }
  const meta = STATUS_META[s.status]
  const lastPayment = [...data.payments]
    .filter((p) => p.flat_id === id && !p.is_void)
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]
  const Fact = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-muted-foreground)]">{k}</span>
      <span className={cn('text-right', strong && 'font-bold')}>{v}</span>
    </div>
  )

  const detailOf = (e: (typeof ledger)[number]) => {
    if (e.type === 'opening') return t('opening_balance_row')
    if (e.type === 'charge') return `${t('maintenance_charge')} · ${monthLabel(e.monthIdx!, lang)}`
    if (e.kind === 'due_clear') return t('pay_clear_dues')
    if (e.coversFrom && e.coversTo) return `${t('payment_row')} · ${monthLabel(monthIndex(e.coversFrom), lang)}–${monthLabel(monthIndex(e.coversTo), lang)}`
    return t('payment_row')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('print_save_pdf')}</Button>
      </div>

      <Card className="printable p-5">
        <div className="mb-1 text-[13px] text-[var(--color-muted-foreground)]">{t('app_title')}</div>
        <h2 className="text-[20px] font-semibold tracking-tight">{t('account_statement')}</h2>
        <div className="mt-3 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[15px] font-semibold">{t('flat')} {flat.id}</span>
            <span className="text-[var(--color-muted-foreground)]">{t(type)} · {formatRupees(s.monthlyCharge)}/mo</span>
          </div>

          <div className={cn('mt-2 text-[19px] font-bold', meta.cls)}>{meta.label}</div>

          <div className="mt-2 space-y-1 text-[13px]">
            {(s.status === 'advance' || s.status === 'clear') && s.paidThroughIdx != null && (
              <Fact k={s.status === 'advance' ? t('paid_advance_through') : t('paid_up_to')} v={monthLabel(s.paidThroughIdx, lang)} strong />
            )}
            {s.status === 'due' && (
              <>
                {s.arrears > 0 && <Fact k={t('outstanding_before')} v={formatRupees(s.arrears)} strong />}
                <Fact k={`${t('this_month_charge')} (${monthLabel(curIdx, lang)})`} v={formatRupees(s.currentMonthDue)} strong />
                <Fact k={t('total_now')} v={formatRupees(s.dueAmount)} />
              </>
            )}
            {s.status === 'cooldown' && (
              <>
                <Fact k={`${t('this_month_charge')} (${monthLabel(curIdx, lang)})`} v={formatRupees(s.currentMonthDue)} strong />
                <div className="text-[var(--color-status-cooldown)]">{t('pay_by_10th')}</div>
              </>
            )}
            {lastPayment && (
              <Fact k={t('last_payment')} v={`${lastPayment.payment_date} · ${formatRupees(lastPayment.amount)}`} />
            )}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="pb-2 pr-2 font-medium">{t('col_date')}</th>
                <th className="pb-2 pr-2 font-medium">{t('col_detail')}</th>
                <th className="pb-2 pr-2 text-right font-medium">{t('amount')}</th>
                <th className="pb-2 text-right font-medium">{t('col_balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {ledger.map((e, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap py-2 pr-2 text-[var(--color-muted-foreground)]">{e.date.slice(5)}</td>
                  <td className="py-2 pr-2">
                    <span className="block">{detailOf(e)}</span>
                    {e.paymentId && (
                      <Link to={`/receipt/${e.paymentId}`} className="no-print text-[12px] text-[var(--color-primary)]">{t('receipt')} →</Link>
                    )}
                  </td>
                  <td className={cn('whitespace-nowrap py-2 pr-2 text-right tabular-nums', e.credit ? 'text-[var(--color-status-clear)]' : 'text-[var(--color-foreground)]')}>
                    {e.credit ? `−${formatRupees(e.credit)}` : `+${formatRupees(e.debit)}`}
                  </td>
                  <td className={cn('whitespace-nowrap py-2 text-right font-medium tabular-nums', e.balance > 0 ? 'text-[var(--color-status-due)]' : 'text-[var(--color-foreground)]')}>{formatRupees(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] text-[var(--color-muted-foreground)]">{t('computer_generated')}</p>
      </Card>
    </div>
  )
}
