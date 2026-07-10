import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, BarChart3, ChevronRight, Wallet } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData, type FlatWithDue } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatRupees, cn, flatName } from '@/lib/utils'
import { monthLabel, todayIST } from '@/lib/dates'
import type { FlatStatus } from '@/lib/calc'

type SortKey = 'dues' | 'flat_asc' | 'flat_desc' | 'amount_desc' | 'amount_asc'
type FilterKey = 'all' | 'due' | 'grace' | 'advance' | 'clear'

const STATUS: Record<FlatStatus, { chip: string; text: string }> = {
  clear:        { chip: 'bg-[var(--color-status-clear-bg)] text-[var(--color-status-clear)]',       text: 'text-[var(--color-status-clear)]' },
  advance:      { chip: 'bg-[var(--color-status-clear-bg)] text-[var(--color-status-clear)]',       text: 'text-[var(--color-status-clear)]' },
  cooldown:     { chip: 'bg-[var(--color-status-cooldown-bg)] text-[var(--color-status-cooldown)]', text: 'text-[var(--color-status-cooldown)]' },
  due:          { chip: 'bg-[var(--color-status-due-bg)] text-[var(--color-status-due)]',           text: 'text-[var(--color-status-due)]' },
  unconfigured: { chip: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)]',   text: 'text-[var(--color-muted-foreground)]' },
}

const ORDER: Record<FlatStatus, number> = { due: 0, cooldown: 1, clear: 2, advance: 2, unconfigured: 3 }

/** Animate a number from 0 up to `target` on mount / whenever the target changes. */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    // Respect users who prefer reduced motion — jump straight to the value.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    let raf = 0
    startRef.current = null
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function FlatCard({ f, highlight }: { f: FlatWithDue; highlight?: boolean }) {
  const { t, lang } = useI18n()
  const s = f.due
  const st = STATUS[s.status]

  // Big amount + small caption at the bottom, colour-coded by status.
  let primary: string
  let secondary: string
  if (s.status === 'advance') {
    primary = t('status_advance')
    secondary = s.paidThroughIdx != null ? `${t('till')} ${monthLabel(s.paidThroughIdx, lang)}` : ''
  } else if (s.status === 'clear') {
    primary = t('status_clear')
    secondary = s.paidThroughIdx != null ? `${t('up_to')} ${monthLabel(s.paidThroughIdx, lang)}` : ''
  } else if (s.status === 'cooldown') {
    primary = formatRupees(s.currentMonthDue)
    secondary = t('in_grace')
  } else if (s.status === 'due') {
    primary = formatRupees(s.arrears > 0 ? s.arrears : s.currentMonthDue)
    secondary = s.arrears > 0
      ? `${t('this_month_charge')} ${formatRupees(s.currentMonthDue)}`
      : t('st_overdue')
  } else {
    primary = '—'
    secondary = t('status_unconfigured')
  }

  return (
    <Link to={`/flat/${f.id}`} className={cn('block h-full', highlight && s.status === 'due' && 'glow-due')}>
      <Card
        className={cn(
          'flex h-full min-h-[104px] cursor-pointer flex-col p-3 transition-shadow duration-200 hover:shadow-[var(--shadow-hover)]',
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold', st.chip)}>
            {f.sort_order}
          </span>
          <span title={flatName(f, lang)} className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight">{flatName(f, lang)}</span>
        </div>
        <div className="mt-auto pt-3">
          <div className={cn('text-[18px] font-bold leading-none display-tight', st.text)}>{primary}</div>
          <div className="mt-1 text-[11px] leading-tight text-[var(--color-muted-foreground)]">{secondary}</div>
        </div>
      </Card>
    </Link>
  )
}

function Stat({ label, value, accent, dotted, to }: { label: string; value: string; accent?: boolean; dotted?: boolean; to?: string }) {
  const inner = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</div>
      <div className={cn('mt-1 text-[17px] font-semibold display-tight tabular-nums', accent && 'text-[var(--color-status-due)]')}>{value}</div>
    </>
  )
  const style = dotted ? { outline: '1.5px dashed var(--color-status-due)', outlineOffset: '-6px', borderRadius: '10px' } : undefined
  const cls = cn('flex-1 px-4 py-3.5 text-center', to && 'cursor-pointer transition-colors hover:bg-[var(--color-accent)]')
  return to
    ? <Link to={to} className={cls} style={style}>{inner}</Link>
    : <div className={cls} style={style}>{inner}</div>
}

const FILTER_MATCH: Record<FilterKey, (s: FlatStatus) => boolean> = {
  all: () => true,
  due: (s) => s === 'due',
  grace: (s) => s === 'cooldown',
  advance: (s) => s === 'advance',
  clear: (s) => s === 'clear',
}

export function Dashboard() {
  const { t, lang } = useI18n()
  const { data, computed, loading, error, reload } = useAppData()
  const today = todayIST()
  const upiReady = !!data.settings.upi_vpa
  const [sort, setSort] = useState<SortKey>('flat_asc')
  const [filter, setFilter] = useState<FilterKey>('all')
  const animatedBalance = useCountUp(computed.balance)

  // On the first scroll down, briefly glow the overdue flat cards, then stop.
  const [highlightDue, setHighlightDue] = useState(false)
  useEffect(() => {
    let fired = false
    const onScroll = () => {
      if (fired || window.scrollY <= 8) return
      fired = true
      window.removeEventListener('scroll', onScroll)
      setHighlightDue(true)
      setTimeout(() => setHighlightDue(false), 5000)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24 text-[var(--color-muted-foreground)]"><Spinner /></div>
  }
  if (error) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-[var(--color-destructive)]" />
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{t('error_loading')}</p>
        <Button onClick={reload} variant="outline" size="sm"><RefreshCw className="h-4 w-4" />{t('retry')}</Button>
      </div>
    )
  }

  const filtered = computed.flatsWithDue.filter((f) => FILTER_MATCH[filter](f.due.status))
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'flat_asc': return a.sort_order - b.sort_order
      case 'flat_desc': return b.sort_order - a.sort_order
      case 'amount_desc': return b.due.balance - a.due.balance
      case 'amount_asc': return a.due.balance - b.due.balance
      default: return ORDER[a.due.status] - ORDER[b.due.status] || b.due.dueAmount - a.due.dueAmount
    }
  })

  const selectCls = 'h-8 text-[13px] py-0'

  const overdueCount = computed.flatsWithDue.filter((f) => f.due.status === 'due').length
  const graceCount = computed.flatsWithDue.filter((f) => f.due.status === 'cooldown').length
  const advanceCount = computed.flatsWithDue.filter((f) => f.due.status === 'advance').length

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Summary card — coloured bank header + white stats */}
      <Card className="mb-3 overflow-hidden">
        <div
          className="px-5 pt-5 pb-5"
          style={{ background: 'linear-gradient(135deg, #0b1a12 0%, #000000 100%)' }}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#4cd07d', opacity: 0.85 }}>
            {t('available_balance')}
          </div>
          <div className="mt-1.5 text-[44px] font-semibold leading-none display-tight tabular-nums" style={{ color: '#4cd07d' }}>
            {formatRupees(animatedBalance)}
          </div>
          <div className="mt-2 text-[12px]" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
            {t('in_bank_note')} · {t('as_of')} {today.day} {monthLabel(today.year * 12 + today.month - 1, lang)}
          </div>
        </div>
        <div className="flex divide-x divide-[var(--color-border)]">
          <Stat label={t('total_collected')} value={formatRupees(computed.totalCollected)} to="/reports?view=in" />
          <Stat label={t('total_spent')} value={formatRupees(computed.totalSpent)} to="/reports?view=out" />
          <Stat label={t('total_dues')} value={formatRupees(computed.totalDues)} accent={computed.totalDues > 0} dotted to="/dues" />
        </div>
      </Card>
      <p className="mb-6 px-1 text-[11px] text-[var(--color-muted-foreground)]">{t('totals_note')}</p>

      {/* Pay call-to-action */}
      {upiReady && (
        <Link to="/pay">
          <div className="shimmer mb-3 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-5 py-4 text-[var(--color-primary-foreground)] transition-transform active:scale-[0.99]">
            <div>
              <div className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" />{t('pay_cta')}</div>
              <div className="mt-0.5 text-[12px] opacity-80">{t('pay_cta_desc')}</div>
            </div>
            <ChevronRight className="h-5 w-5 opacity-80" />
          </div>
        </Link>
      )}

      {/* Reports call-to-action — black card, same radius as the bank card */}
      <Link to="/reports">
        <div className="mb-3 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-foreground)] px-5 py-4 text-[var(--color-background)] transition-transform active:scale-[0.99]">
          <div>
            <div className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" />{t('monthly_report')}</div>
            <div className="mt-0.5 text-[12px] opacity-70">{t('reports_cta_desc')}</div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-70" />
        </div>
      </Link>

      {/* At-a-glance status counts — overdue / current-month / advance */}
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-status-due-bg)] p-3 text-center">
          <div className="text-[26px] font-bold leading-none display-tight text-[var(--color-status-due)]">{overdueCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-status-due)]">{t('st_overdue')}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-status-cooldown-bg)] p-3 text-center">
          <div className="text-[26px] font-bold leading-none display-tight text-[var(--color-status-cooldown)]">{graceCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-status-cooldown)]">{t('grace_short')}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-status-clear-bg)] p-3 text-center">
          <div className="text-[26px] font-bold leading-none display-tight text-[var(--color-status-clear)]">{advanceCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-status-clear)]">{t('status_advance')}</div>
        </div>
      </div>

      <h2 className="mb-3 text-[17px] font-semibold tracking-tight">{t('flats')}</h2>

      <div className="mb-3 flex gap-2">
        <Select className={selectCls} value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)}>
          <option value="all">{t('filter_all')}</option>
          <option value="due">{t('filter_due')}</option>
          <option value="grace">{t('filter_grace')}</option>
          <option value="advance">{t('filter_advance')}</option>
          <option value="clear">{t('filter_clear')}</option>
        </Select>
        <Select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="flat_asc">{t('sort_flat_asc')}</option>
          <option value="flat_desc">{t('sort_flat_desc')}</option>
          <option value="dues">{t('sort_dues_first')}</option>
          <option value="amount_desc">{t('sort_amount_desc')}</option>
          <option value="amount_asc">{t('sort_amount_asc')}</option>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--color-muted-foreground)]">{t('no_flats_match')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {sorted.map((f) => <FlatCard key={f.id} f={f} highlight={highlightDue} />)}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-[var(--color-muted-foreground)]">{t('date_format_note')}</p>
    </div>
  )
}
