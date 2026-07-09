import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useI18n } from '@/lib/i18n'
import { useAppData } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, Field } from '@/components/ui/input'
import { formatRupees, cn } from '@/lib/utils'
import { currentMonthIndex, monthLabel } from '@/lib/dates'
import { buildUpiUrl } from '@/lib/upi'

const QUICK = [1, 3, 6, 12]

export function Pay() {
  const { t, lang } = useI18n()
  const { data, computed, loading } = useAppData()
  const vpa = data.settings.upi_vpa || ''
  const payee = data.settings.upi_payee_name || 'Gurucharni Apartment'

  const [flatId, setFlatId] = useState('G1')
  const [mode, setMode] = useState<'dues' | 'months'>('months')
  const [months, setMonths] = useState(1)

  const fwd = computed.flatsWithDue.find((f) => f.id === flatId)
  const charge = fwd?.due.monthlyCharge ?? 0
  const outstanding = fwd?.due.dueAmount ?? 0
  const curIdx = currentMonthIndex()
  // Next unpaid month = the month this flat is paid through + 1.
  // Advance/clear flats have paidThroughIdx; owing flats (null) start at the current month.
  const nextPayableIdx = (fwd?.due.paidThroughIdx ?? curIdx - 1) + 1

  // Default to "pay dues" when something is owed, else "pay ahead".
  useEffect(() => { setMode(outstanding > 0 ? 'dues' : 'months') }, [flatId]) // eslint-disable-line

  const m = Math.max(1, months)
  const toIdx = nextPayableIdx + m - 1
  const rangeLabel = m > 1 ? `${monthLabel(nextPayableIdx, lang)} – ${monthLabel(toIdx, lang)}` : monthLabel(nextPayableIdx, lang)

  const amount = mode === 'dues' ? outstanding : m * charge
  const reference = mode === 'dues'
    ? `Gurucharni ${flatId} maintenance dues`
    : `Gurucharni ${flatId} maintenance ${rangeLabel}`
  const url = buildUpiUrl({ vpa, payee, amount, note: reference })

  if (loading) return <div className="py-24 text-center text-[var(--color-muted-foreground)]">{t('loading')}</div>

  const modeBtn = (mk: typeof mode, label: string) => (
    <button type="button" onClick={() => setMode(mk)}
      className={cn('flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
        mode === mk ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}>{label}</button>
  )

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" />{t('back')}</Button></Link>
        <h2 className="text-[17px] font-semibold tracking-tight">{t('pay_page_title')}</h2>
      </div>

      <Card className="space-y-3 p-4">
        <Field label={t('select_flat')}>
          <Select value={flatId} onChange={(e) => setFlatId(e.target.value)}>
            {computed.flatsWithDue.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
          </Select>
        </Field>

        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--color-muted-foreground)]">{t('monthly_charge')}</span>
          <span className="font-medium tabular-nums">{formatRupees(charge)}</span>
        </div>
        {outstanding > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--color-muted-foreground)]">{t('you_owe')}</span>
            <span className="font-medium tabular-nums text-[var(--color-status-due)]">{formatRupees(outstanding)}</span>
          </div>
        )}

        {outstanding > 0 && (
          <div className="flex rounded-full bg-[var(--color-secondary)] p-0.5">
            {modeBtn('dues', t('pay_dues'))}
            {modeBtn('months', t('pay_ahead'))}
          </div>
        )}

        {mode === 'months' && (
          <div>
            <div className="mb-1.5 text-[13px] font-medium">{t('how_many_months')}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK.map((n) => (
                <button key={n} type="button" onClick={() => setMonths(n)}
                  className={cn('rounded-full border px-3.5 py-1 text-[13px] transition-colors',
                    m === n ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]')}>
                  {n}
                </button>
              ))}
              <input type="number" min={1} value={months}
                onChange={(e) => setMonths(Math.max(1, Number.parseInt(e.target.value) || 1))}
                className="w-16 rounded-full border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-1 text-center text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-4 flex flex-col items-center gap-3 p-4 text-center">
        <div className="text-[13px] text-[var(--color-muted-foreground)]">
          {mode === 'dues' ? t('clearing_outstanding') : `${m} × ${formatRupees(charge)} · ${rangeLabel}`}
        </div>
        <div className="text-3xl font-semibold display-tight">{formatRupees(amount)}</div>
        {vpa && amount > 0 ? (
          <>
            <div className="rounded-xl bg-white p-3 shadow-sm"><QRCodeSVG value={url} size={180} /></div>
            <div className="text-[13px] text-[var(--color-muted-foreground)]">{t('scan_upi')}</div>
            <div className="text-[13px]"><span className="text-[var(--color-muted-foreground)]">UPI ID: </span><span className="font-medium">{vpa}</span></div>
            <div className="text-[12px] text-[var(--color-muted-foreground)]">“{reference}”</div>
            <a href={url} className="w-full"><Button className="w-full"><Smartphone className="h-4 w-4" />{t('open_upi_app')}</Button></a>
          </>
        ) : (
          <div className="text-[13px] text-[var(--color-muted-foreground)]">{vpa ? t('all_paid') : t('upi_not_set')}</div>
        )}
      </Card>
    </div>
  )
}
