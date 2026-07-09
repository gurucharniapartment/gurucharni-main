# Gurucharni Apartment — Maintenance Management Platform
## Project Scope & Specification

_Last updated: 2026-07-09_

---

## 1. Tech Stack (LOCKED)

| Layer | Choice | Notes |
|---|---|---|
| Database | **Supabase (Postgres)** | Real-time enabled, free tier only. ₹0/month hard ceiling. |
| Auth | **Supabase Auth** | Single admin login; passwords hashed by Supabase (bcrypt). No custom crypto. |
| Real-time | **Supabase Realtime** | Live balance/dues updates. |
| Frontend | **React + Vite** | Static build. |
| UI kit | **shadcn/ui + Tailwind** | Clean, balanced color (not too loud, not flat), user icons, mobile-first responsive UX. |
| Hosting | **GitHub Pages** | New personal GitHub account. Static site only — data lives in Supabase. |
| Error handling | Required throughout | Graceful failures, user-facing messages, retry where sensible. |
| Timezone | **Asia/Kolkata (IST)** | All date logic. |
| Currency | **Whole rupees (₹)** | No paise, no partial payments. |

**Security model:** Supabase **Row Level Security (RLS)**. Public = read-only on everything. Only the authenticated admin can write/edit. The anon key in the frontend is safe because RLS blocks all writes without an admin session.

---

## 2. Access & Views

### Public view (no login) — read-only
- Top-of-page **collective building balance** (collected − expenses).
- Flat grid with per-flat status colors (see §4).
- **Month calendar / picker**: months before **July 2026 disabled**; July 2026 → future selectable.
- Click a month → **pie chart** of expenses by category + **table** of expenses for that month.
- **Custom date range** selector for the same pie + table.
- **UPI payment**: QR image and/or `upi://` deep link that opens PhonePe / Google Pay directly (no SDK).
- Absolutely no ability to change any data.

### Admin view (Supabase Auth login) — full control
- Everything the public sees, plus:
- Record payments, add/edit expenses, edit flats.
- **Per-flat config screen**: set starting point (paid-through month), flat type + effective date, etc.
- Manage categories (editable list).
- Electricity-bill **monthly reminder** prompt.
- One-click **CSV export** (full backup).
- Audit trail of all changes.

One admin login; the key/credentials shared with a trusted committee member.

---

## 3. Data Model

### Flats
- Primary key: **G1 … G14** (Gurucharni 1–14).
- Never store resident names — flat number only.
- **Type**: `residential` (₹800/month) or `tenant_occupied` (rate TBD).
- Type is **effective-dated** (a flat can switch type; calculation changes from the effective date forward — past months keep their old type/rate).

### Rates (effective-dated)
- Rate per type, with `effective_from` month.
- When a rate changes, it applies **from that month forward**; past months keep the old rate.

### Payments (ledger — one row each)
- `flat`, `date`, `amount`, `months_covered`, derived `paid_through` advance.
- Whole months only — **no partial payments**.
- **Entry method:** admin picks flat + **number of months**; the system computes the amount from rate history for the covered months and advances `paid_through`.

### Expenses (ledger — one row each)
- `category` (editable list), `remark` (**mandatory**), `amount`, `date`.
- Every expense deducts from the collective balance.
- Watchman salary: **₹2,500/month, fixed**. **Auto-generated monthly** (effective-dated; raises handled by a new effective-dated row, past months unchanged). Baseline effective from July 2026.
- Electricity: **manual entry** + admin reminder each month (amount varies).

### Soft-delete only
- **No hard deletes ever.** Voided/orphaned rows are retained in the dataset but excluded from calculations.
- Voiding must **never corrupt** balance or dues math. (Critical.)

### Audit trail
- Log who changed what and when (payments, expenses, flat edits, voids).

---

## 4. Dues Logic (calculation-critical)

**Billing cycle:** charge accrues on the **1st of each month**.

**Cooldown:** 10-day grace period (1st–10th).

**Three states with colors:**
| State | Color | Meaning |
|---|---|---|
| Cleared / Advance | **Green** | Paid up to or beyond the current month. If ahead: "Advance — paid through <Month YYYY>". |
| Cooldown | **Blue** | Only the current month is unpaid AND today ≤ 10th ("Please pay the dues"). |
| Due / Pending | **Red** | Any month before the current is unpaid, OR current month unpaid and today > 10th. |

**Due amount** = sum, over each unpaid month from (paid_through + 1) up to the current month, of that month's applicable rate — respecting **rate history** and **flat-type history**.

**Advance** = paid_through month beyond the current month.

**Canonical state per flat** = a single `paid_through_month` value. Everything (due / advance / color) is derived from it + today's date + rate/type history. Recomputed live on every load.

---

## 5. Money In / Out & Reports

- **Collective balance** shown at the very top: total maintenance collected − total expenses.
- Breakdown by expense **category**.
- **Month-on-month reports** over selectable intervals (matches the public month picker + custom range).
- **CSV export** of all data (one click).

---

## 6. Deferred / Out of Scope (for now)

- **Notices board** — reserve layout space, build later.
- Multiple admins — one for now, easy to extend.

---

## 7. Open Items (need from you)

1. **Tenant-occupied monthly rate** (₹?).
2. Which of G1–G14 are **tenant-occupied** currently.
3. **Per-flat starting point** (paid-through month as of today) — will be entered via the admin per-flat config screen.
4. UPI ID / VPA (and/or QR image) for the payment link.
