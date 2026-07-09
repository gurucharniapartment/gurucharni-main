import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, BarChart3, ChevronRight, Wallet } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAppData, type FlatWithDue } from '@/hooks/useAppData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { formatRupees, cn } from '@/lib/utils'
import { monthLabel, todayIST } from '@/lib/dates'
import type { FlatStatus } from '@/lib/calc'

type SortKey = 'dues' | 'flat_asc' | 'flat_desc' | 'amount_desc' | 'amount_asc'
type FilterKey = 'all' | 'due' | 'grace' | 'advance' | 'clear'

const STATUS: Record<FlatStatus, { dot: string; chip: string; edge: string }> = {
  clear:        { dot: 'bg-[var(--color-status-clear)]',    chip: 'bg-[var(--color-status-clear-bg)] text-[var(--color-status-clear)]',       edge: '' },
  advance:      { dot: 'bg-[var(--color-status-clear)]',    chip: 'bg-[var(--color-status-clear-bg)] text-[var(--color-status-clear)]',       edge: '' },
  cooldown:     { dot: 'bg-[var(--color-status-cooldown)]', chip: 'bg-[var(--color-status-cooldown-bg)] text-[var(--color-status-cooldown)]', edge: '' },
  due:          { dot: 'bg-[var(--color-status-due)]',      chip: 'bg-[var(--color-status-due-bg)] text-[var(--color-status-due)]',           edge: 'ring-1 ring-[var(--color-status-due)]/15' },
  unconfigured: { dot: 'bg-[var(--color-status-neutral)]',  chip: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)]',   edge: '' },
}

const ORDER: Record<FlatStatus, number> = { due: 0, cooldown: 1, clear: 2, advance: 2, unconfigured: 3 }

function FlatCard({ f }: { f: FlatWithDue }) {
  const { t, lang } = useI18n()
  const s = f.due
  const st = STATUS[s.status]

  let detail: ReactNode
  if (s.status === 'advance' || s.status === 'clear') {
    detail = (
      <span className="text-[var(--color-muted-foreground)]">
        {t('paid_through')} {s.paidThroughIdx != null ? monthLabel(s.paidThroughIdx, lang) : ''}
      </span>
    )
  } else if (s.status === 'cooldown') {
    detail = (
      <span className="font-medium text-[var(--color-status-cooldown)]">
        {formatRupees(s.dueAmount)} · {t('in_grace')}
      </span>
    )
  } else if (s.status === 'due') {
    detail = s.arrears > 0 ? (
      <span className="font-medium text-[var(--color-status-due)]">
        {formatRupees(s.arrears)} {t('due_label')}
        <span className="font-normal text-[var(--color-muted-foreground)]"> + {formatRupees(s.currentMonthDue)} {t('this_month_charge').toLowerCase()}</span>
      </span>
    ) : (
      <span className="font-medium text-[var(--color-status-due)]">
        {formatRupees(s.dueAmount)} {t('due_label')}
      </span>
    )
  } else {
    detail = <span className="text-[var(--color-muted-foreground)]">—</span>
  }

  return (
    <Link to={`/flat/${f.id}`} className="block">
    <Card
      className={cn(
        'cursor-pointer p-3.5 transition-shadow duration-200 hover:shadow-[var(--shadow-hover)]',
        st.edge,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', st.dot)} />
          <span className="text-[15px] font-semibold tracking-tight">{f.id}</span>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st.chip)}>
          {t(`status_${s.status}`)}
        </span>
      </div>
      <div className="mt-2 text-[12px] leading-tight">{detail}</div>
    </Card>
    </Link>
  )
}

function Stat({ label, value, accent, dotted }: { label: string; value: string; accent?: boolean; dotted?: boolean }) {
  return (
    <div
      className="flex-1 px-4 py-3.5 text-center"
      style={dotted ? { outline: '1.5px dashed var(--color-status-due)', outlineOffset: '-6px', borderRadius: '10px' } : undefined}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[17px] font-semibold display-tight tabular-nums',
          accent && 'text-[var(--color-status-due)]',
        )}
      >
        {value}
      </div>
    </div>
  )
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
          <Stat label={t('total_collected')} value={formatRupees(computed.totalCollected)} />
          <Stat label={t('total_spent')} value={formatRupees(computed.totalSpent)} />
          <Stat label={t('total_dues')} value={formatRupees(computed.totalDues)} accent={computed.totalDues > 0} dotted />
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
