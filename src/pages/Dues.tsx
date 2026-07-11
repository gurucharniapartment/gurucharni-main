import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Share2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatRupees, flatName, cn } from '@/lib/utils'
import { currentMonthIndex, monthLabel } from '@/lib/dates'

export function Dues() {
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()
  const { isAdmin } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [sortKey, setSortKey] = useState<'amount' | 'flat' | 'name'>('amount')

  const curIdx = currentMonthIndex()
  const curMonthLabel = monthLabel(curIdx, lang)

  const rows = computed.flatsWithDue
    .filter((f) => f.due.dueAmount > 0)
    .sort((a, b) => {
      if (sortKey === 'flat') return a.sort_order - b.sort_order
      if (sortKey === 'name') return flatName(a, lang).localeCompare(flatName(b, lang))
      return b.due.dueAmount - a.due.dueAmount
    })

  // Most recent non-void payment per flat (for the cleared table).
  const lastPaymentOf = (flatId: string) =>
    [...data.payments]
      .filter((p) => p.flat_id === flatId && !p.is_void)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]

  // Flats that owe nothing: paid up ('clear') or paid ahead ('advance'),
  // sorted by most recent payment first (flats with no payment last).
  const clearedRows = computed.flatsWithDue
    .filter((f) => f.due.status === 'clear' || f.due.status === 'advance')
    .sort((a, b) => (lastPaymentOf(b.id)?.payment_date ?? '').localeCompare(lastPaymentOf(a.id)?.payment_date ?? ''))

  const totArrears = rows.reduce((s, f) => s + f.due.arrears, 0)
  const totMonth = rows.reduce((s, f) => s + f.due.currentMonthDue, 0)
  const totAll = rows.reduce((s, f) => s + f.due.dueAmount, 0)

  // Render the dues table to a PNG and share it (WhatsApp etc.) via the Web
  // Share API; fall back to a download where file-sharing isn't supported.
  async function shareImage() {
    const node = cardRef.current
    if (!node) return
    setSharing(true)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'pending-dues.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('who_owes'), text: `${t('who_owes')} · ${curMonthLabel}` })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl; a.download = 'pending-dues.png'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') console.error(e)
    } finally {
      setSharing(false)
    }
  }

  const sortBtn = (k: typeof sortKey, label: string) => (
    <button
      type="button" onClick={() => setSortKey(k)}
      className={cn('rounded-full px-3 py-1 text-[12px] font-medium transition-all',
        sortKey === k ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}
    >{label}</button>
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <h2 className="text-[17px] font-semibold tracking-tight">{t('who_owes')}</h2>
      </div>

      {!loading && rows.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex rounded-full bg-[var(--color-secondary)] p-0.5">
            {sortBtn('amount', t('amount'))}
            {sortBtn('flat', t('flat'))}
            {sortBtn('name', t('col_name'))}
          </div>
          {isAdmin && (
            <Button variant="secondary" size="sm" disabled={sharing} onClick={shareImage}>
              <Share2 className="h-4 w-4" />{t('share_image')}
            </Button>
          )}
        </div>
      )}

      <div ref={cardRef}>
      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-8 text-[var(--color-muted-foreground)]"><Spinner size={22} /></div>
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
      </div>

      {/* Flats that have already cleared their dues (paid up or paid ahead). */}
      <h3 className="mb-3 mt-6 text-[15px] font-semibold tracking-tight">{t('cleared_title')}</h3>
      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-8 text-[var(--color-muted-foreground)]"><Spinner size={22} /></div>
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
