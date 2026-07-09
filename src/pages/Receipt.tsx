import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Printer, MessageCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatRupees, flatName } from '@/lib/utils'
import { monthLabel, monthIndex } from '@/lib/dates'

export function Receipt() {
  const { id = '' } = useParams()
  const { t, lang } = useI18n()
  const { data, loading } = useAppData()

  const p = data.payments.find((x) => String(x.id) === id)

  if (loading) return <div className="flex justify-center py-24 text-[var(--color-muted-foreground)]"><Spinner /></div>
  if (!p) return <div className="py-24 text-center text-[var(--color-muted-foreground)]">—</div>

  const period =
    p.kind === 'due_clear'
      ? t('pay_clear_dues')
      : p.covers_from && p.covers_to
        ? `${monthLabel(monthIndex(p.covers_from), lang)} – ${monthLabel(monthIndex(p.covers_to), lang)}`
        : t('pay_maintenance')

  const receiptNo = `GCA-${String(p.id).padStart(4, '0')}`
  const flat = data.flats.find((f) => f.id === p.flat_id)
  const flatText = `${flatName(flat, lang)} (${p.flat_id})`
  const waText = encodeURIComponent(
    `${t('payment_receipt')} ${receiptNo}\n${t('app_title')}\n${t('flat')}: ${flatText}\n${t('amount_received')}: ${formatRupees(p.amount)}\n${t('for_period')}: ${period}\n${t('col_date')}: ${p.payment_date}`,
  )

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between gap-3 py-1.5 text-[14px]">
      <span className="text-[var(--color-muted-foreground)]">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link to={`/flat/${p.flat_id}`}><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <div className="flex gap-2">
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm"><MessageCircle className="h-4 w-4" />{t('share_whatsapp')}</Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('print_save_pdf')}</Button>
        </div>
      </div>

      <Card className="printable p-6">
        <div className="text-center">
          <div className="text-[13px] text-[var(--color-muted-foreground)]">{t('app_title')}</div>
          <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">{t('payment_receipt')}</h2>
        </div>
        <div className="my-4 rounded-[var(--radius-md)] bg-[var(--color-muted)] py-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">{t('amount_received')}</div>
          <div className="text-[32px] font-semibold display-tight text-[var(--color-status-clear)]">{formatRupees(p.amount)}</div>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          <Row k={t('receipt_no')} v={receiptNo} />
          <Row k={t('col_date')} v={p.payment_date} />
          <Row k={t('received_from')} v={flatText} />
          <Row k={t('for_period')} v={period} />
          {data.settings.upi_vpa ? <Row k="UPI" v={data.settings.upi_vpa} /> : null}
          {p.note ? <Row k={t('note')} v={p.note} /> : null}
        </div>
        <p className="mt-5 text-center text-[11px] text-[var(--color-muted-foreground)]">{t('computer_generated')}</p>
      </Card>
    </div>
  )
}
