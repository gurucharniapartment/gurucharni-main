// Month math is done on an integer "month index" = year*12 + (month-1).
// Months are stored/passed as first-of-month ISO strings ('YYYY-MM-01').
// Date strings are parsed manually (never via `new Date(str)`) so there is
// zero timezone drift in the dues calculation.

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर',
]

/** Parse 'YYYY-MM-DD' (or 'YYYY-MM') into {year, month(1-12), day}. */
export function parseISO(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10))
  return { year: y, month: m, day: d || 1 }
}

/** Month index from an ISO date string. */
export function monthIndex(dateStr: string): number {
  const { year, month } = parseISO(dateStr)
  return year * 12 + (month - 1)
}

/** Build a month index from year and 1-12 month. */
export function makeMonthIndex(year: number, month1to12: number): number {
  return year * 12 + (month1to12 - 1)
}

/** Month index -> 'YYYY-MM-01'. */
export function monthIndexToISO(index: number): string {
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/** Today's date in India Standard Time. Uses the real clock (browser). */
export function todayIST(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Current month index in IST. */
export function currentMonthIndex(): number {
  const t = todayIST()
  return makeMonthIndex(t.year, t.month)
}

/** Human label for a month index, e.g. 'July 2026' / 'जुलै 2026'. */
export function monthLabel(index: number, lang: 'en' | 'mr' = 'en'): string {
  const year = Math.floor(index / 12)
  const month = index % 12
  const names = lang === 'mr' ? MONTHS_MR : MONTHS_EN
  return `${names[month]} ${year}`
}

/** First-of-month ISO for the current IST month (used as calendar lower bound context). */
export function currentMonthISO(): string {
  return monthIndexToISO(currentMonthIndex())
}

/** Today's date in IST as 'YYYY-MM-DD' (for date input defaults). */
export function todayISODate(): string {
  const t = todayIST()
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
}

/** Current IST month as 'YYYY-MM' (for month input defaults). */
export function currentMonthInput(): string {
  const t = todayIST()
  return `${t.year}-${String(t.month).padStart(2, '0')}`
}

/** Convert a month-input 'YYYY-MM' to first-of-month ISO 'YYYY-MM-01'. */
export function monthInputToISO(monthInput: string): string {
  return `${monthInput}-01`
}

/** Convert an ISO date/month to a month-input 'YYYY-MM'. */
export function isoToMonthInput(iso: string): string {
  return iso.slice(0, 7)
}
