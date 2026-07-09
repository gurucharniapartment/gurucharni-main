// Types mirror the Supabase schema (see supabase/schema.sql).
// All money values are whole rupees (integers). All "month" dates are the
// first day of the month, e.g. '2026-07-01'.

export type FlatType = 'residential' | 'tenant_occupied'

export interface Flat {
  id: string // 'G1' .. 'G14'
  label_en: string
  label_mr: string
  // Rupee ledger model: opening balance as of the start of the tracking month,
  // BEFORE that month's charge. Positive = owes, negative = advance/credit.
  opening_due: number
  sort_order: number
  is_active: boolean
  created_at: string
  // Deprecated (month-based model); kept nullable for backward compat.
  start_paid_through_month?: string | null
  paid_through_month?: string | null
}

// Per-flat monthly maintenance charge, effective-dated (supports future rate changes).
export interface FlatCharge {
  id: number
  flat_id: string
  amount: number // ₹/month, whole rupees
  effective_from: string // 'YYYY-MM-01'
  created_at: string
}

export interface FlatTypeHistory {
  id: number
  flat_id: string
  type: FlatType
  effective_from: string // 'YYYY-MM-01'
  created_at: string
}

export interface Rate {
  id: number
  type: FlatType
  amount: number
  effective_from: string // 'YYYY-MM-01'
  created_at: string
}

export type PaymentKind = 'maintenance' | 'due_clear'

export interface Payment {
  id: number
  flat_id: string
  payment_date: string
  kind: PaymentKind
  months_covered: number | null
  covered_months: string | null // comma list of 'YYYY-MM' (maintenance only)
  amount: number
  covers_from: string | null
  covers_to: string | null
  note: string | null
  is_void: boolean
  created_by: string | null
  created_at: string
}

export interface ExpenseCategory {
  id: number
  name_en: string
  name_mr: string
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: number
  category_id: number
  expense_date: string
  amount: number
  remark: string
  is_auto: boolean
  is_void: boolean
  created_by: string | null
  created_at: string
}

export interface RecurringExpense {
  id: number
  name_en: string
  name_mr: string
  category_id: number | null
  amount: number
  effective_from: string
  is_active: boolean
  created_at: string
}

export interface AppSetting {
  key: string
  value: string | null
}
