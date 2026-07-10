import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Printer, Wallet } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatRupees, cn, flatName } from '@/lib/utils'
import { currentMonthIndex, monthLabel, monthIndex } from '@/lib/dates'
import { typeForMonth } from '@/lib/calc'
import { buildFlatLedger } from '@/lib/ledger'

export function FlatStatement() {
  const { id = '' } = useParams()
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()
  const { isAdmin } = useAuth()

  const flat = data.flats.find((f) => f.id === id)
  const fwd = computed.flatsWithDue.find((f) => f.id === id)
  const curIdx = currentMonthIndex()

  if (loading) return <div className="flex justify-center py-24 text-[var(--color-muted-foreground)]"><Spinner /></div>
  if (!flat || !fwd) return <div className="py-24 text-center text-[var(--color-muted-foreground)]">—</div>

  const type = typeForMonth(data.typeHistory, id, curIdx) ?? 'residential'
  const ledger = buildFlatLedger({
    flatId: id, openingDue: flat.opening_due, charges: data.charges,
    payments: data.payments, trackingStartIdx: computed.trackingStartIdx, currentMonthIdx: curIdx,
  })
  const s = fwd.due
  const curMonthLabel = monthLabel(curIdx, lang)
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
          <div>
            <div className="text-[17px] font-semibold tracking-tight">{flatName(flat, lang)}</div>
            <div className="text-[12px] text-[var(--color-muted-foreground)]">{t('flat')} {flat.id} · {t(type)}</div>
          </div>

          {/* Per-month + 6-month maintenance amounts, prominent rounded bars. */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-[var(--color-secondary)] px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('monthly_maintenance')}</span>
            <span className="text-[17px] font-bold tabular-nums">{formatRupees(s.monthlyCharge)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-[var(--color-secondary)] px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('six_month_maintenance')}</span>
            <span className="text-[17px] font-bold tabular-nums">{formatRupees(s.monthlyCharge * 6)}</span>
          </div>

          {/* Status summary — colour-coded box: red = overdue, blue = this month
              pending, green = paid / paid-ahead. */}
          {(() => {
            const pending = s.status === 'due' || s.status === 'cooldown'
            const tone =
              s.status === 'due'
                ? 'border-[var(--color-status-due)]/30 bg-[var(--color-status-due-bg)] text-[var(--color-status-due)]'
                : s.status === 'cooldown'
                  ? 'border-[var(--color-status-cooldown)]/30 bg-[var(--color-status-cooldown-bg)] text-[var(--color-status-cooldown)]'
                  : s.status === 'advance' || s.status === 'clear'
                    ? 'border-[var(--color-status-clear)]/30 bg-[var(--color-status-clear-bg)] text-[var(--color-status-clear)]'
                    : 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
            return (
              <div className={cn('mt-3 rounded-[var(--radius-lg)] border p-4', tone)}>
                <div className="text-[18px] font-bold">{meta.label}</div>

                {s.status === 'due' && (
                  <div className="mt-2 space-y-1 text-[13px] text-[var(--color-foreground)]">
                    {s.arrears > 0 && (
                      <Fact k={`${t('pay_outstanding')} (${t('before_month')} ${curMonthLabel})`} v={formatRupees(s.arrears)} strong />
                    )}
                    <Fact k={`${curMonthLabel} (${t('this_month_charge')})`} v={formatRupees(s.currentMonthDue)} strong />
                    <div className="mt-1 border-t border-[var(--color-border)] pt-1">
                      <Fact k={t('total_now')} v={formatRupees(s.dueAmount)} strong />
                    </div>
                  </div>
                )}

                {s.status === 'cooldown' && (
                  <div className="mt-2 space-y-1 text-[13px] text-[var(--color-foreground)]">
                    <Fact k={`${curMonthLabel} (${t('this_month_charge')})`} v={formatRupees(s.currentMonthDue)} strong />
                  </div>
                )}

                {(s.status === 'advance' || s.status === 'clear') && s.paidThroughIdx != null && (
                  <div className="mt-1 text-[13px] font-medium">
                    {s.status === 'advance' ? t('paid_advance_through') : t('paid_up_to')} {monthLabel(s.paidThroughIdx, lang)}
                  </div>
                )}

                {pending && (
                  <Link to={`/pay?flat=${flat.id}`} className="no-print mt-3 block">
                    <Button className="w-full"><Wallet className="h-4 w-4" />{t('pay_cta')}</Button>
                  </Link>
                )}
              </div>
            )
          })()}

          {lastPayment && (
            <div className="mt-2 text-[12px] text-[var(--color-muted-foreground)]">
              {t('last_payment')}: {lastPayment.payment_date} · {formatRupees(lastPayment.amount)}
            </div>
          )}
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
                    {isAdmin && e.paymentId && (
                      <Link to={`/receipt/${e.paymentId}`} className="no-print text-[12px] text-[var(--color-primary)]">{t('receipt')} →</Link>
                    )}
                  </td>
                  <td className={cn('whitespace-nowrap py-2 pr-2 text-right tabular-nums', e.credit ? 'text-[var(--color-status-clear)]' : 'text-[var(--color-foreground)]')}>
                    {e.credit ? formatRupees(e.credit) : formatRupees(e.debit)}
                  </td>
                  <td className={cn('whitespace-nowrap py-2 text-right font-medium tabular-nums',
                    e.balance > 0 ? 'text-[var(--color-status-due)]' : e.balance < 0 ? 'text-[var(--color-status-clear)]' : 'text-[var(--color-foreground)]')}>
                    {formatRupees(Math.abs(e.balance))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--color-status-clear)]" />{t('col_paid')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--color-status-due)]" />{t('due_label')}</span>
        </div>
        <p className="mt-4 text-[11px] text-[var(--color-muted-foreground)]">{t('computer_generated')}</p>
      </Card>
    </div>
  )
}
