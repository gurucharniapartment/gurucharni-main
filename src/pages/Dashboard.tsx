import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, BarChart3, ChevronRight, Wallet } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData, type FlatWithDue } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
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

function FlatCard({ f }: { f: FlatWithDue }) {
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
      ? `+ ${formatRupees(s.currentMonthDue)} ${t('this_month_charge').toLowerCase()}`
      : t('st_overdue')
  } else {
    primary = '—'
    secondary = t('status_unconfigured')
  }

  return (
    <Link to={`/flat/${f.id}`} className="block h-full">
      <Card
        className={cn(
          'flex h-full min-h-[104px] cursor-pointer flex-col p-3 transition-shadow duration-200 hover:shadow-[var(--shadow-hover)]',
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold', st.chip)}>
            {f.sort_order}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight">{flatName(f, lang)}</span>
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

  if (loading) {
    return <div className="py-24 text-center text-[var(--color-muted-foreground)]">{t('loading')}</div>
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Summary card — coloured bank header + white stats */}
      <Card className="mb-3 overflow-hidden">
        <div
          className="px-5 pt-5 pb-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0f5132 0%, #1a7a4c 100%)' }}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide opacity-85">
            {t('available_balance')}
          </div>
          <div className="mt-1.5 text-[44px] font-semibold leading-none display-tight">
            {formatRupees(computed.balance)}
          </div>
          <div className="mt-2 text-[12px] opacity-85">
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
          <div className="mb-3 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-5 py-4 text-[var(--color-primary-foreground)] transition-transform active:scale-[0.99]">
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
        <div className="mb-6 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-foreground)] px-5 py-4 text-[var(--color-background)] transition-transform active:scale-[0.99]">
          <div>
            <div className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" />{t('monthly_report')}</div>
            <div className="mt-0.5 text-[12px] opacity-70">{t('reports_cta_desc')}</div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-70" />
        </div>
      </Link>

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
          {sorted.map((f) => <FlatCard key={f.id} f={f} />)}
        </div>
      )}
    </div>
  )
}
