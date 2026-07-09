# Data Request — Gurucharni Apartment
_Fill in the blanks and send back. Today's reference date: 9 July 2026 (we're inside July's 10-day grace window)._

---

## A. Rates

1. **Tenant-occupied maintenance rate:** ₹______ per month.
2. **Is the tenant rate the same for every tenant flat?**  ☐ Yes   ☐ No → if no, list per-flat amounts in the table below.
3. **Has the residential ₹800 rate _or_ the tenant rate ever changed** during the period any flat still has unpaid dues?
   ☐ No, constant   ☐ Yes → old rate ₹______ , changed to new rate from (month/year) ____________.

---

## B. Per-flat table  (the core input)

For each flat give me **two things**:
- **Type** — `R` (residential) or `T` (tenant-occupied)
- **Last fully-paid month** as of today — the most recent month this flat has *completely* paid for.

**How to express "last fully-paid month":**
- Fully up to date (owes only July, still in grace) → write **June 2026**
- Owes 7 months → last paid = **December 2025**
- Owes 1 full year → last paid = **June 2025**
- Paid in advance through Dec 2026 → write **December 2026**
- Brand new / never tracked → write **—** and I'll treat as unconfigured

| Flat | Type (R/T) | Last fully-paid month | (only if tenant rate differs) ₹/mo |
|------|-----------|-----------------------|-------------------------------------|
| G1   |           |                       |                                     |
| G2   |           |                       |                                     |
| G3   |           |                       |                                     |
| G4   |           |                       |                                     |
| G5   |           |                       |                                     |
| G6   |           |                       |                                     |
| G7   |           |                       |                                     |
| G8   |           |                       |                                     |
| G9   |           |                       |                                     |
| G10  |           |                       |                                     |
| G11  |           |                       |                                     |
| G12  |           |                       |                                     |
| G13  |           |                       |                                     |
| G14  |           |                       |                                     |

4. **Are all 14 flats liable for maintenance**, or is any flat exempt / not charged (e.g. vacant, owner-occupied-committee)?
   ☐ All 14 pay   ☐ Exceptions: ____________________

---

## C. Fund balance (money already in hand)

The app shows **Available Balance = collected − spent**. Since we're not importing years of old records, I need a starting point so the balance reflects reality.

5. **What is the actual total maintenance money currently available** (cash + bank) as of today?  ₹______
   - I'll seed this as an "opening balance" dated 1 July 2026.
   - _Alternative:_ ☐ Start from ₹0 on 1 July 2026 and only count from here (choose this only if you don't have a running total).

---

## D. Expenses

6. **Any recurring FIXED monthly cost besides the watchman (₹2,500)?**  (e.g. cleaning, common-area fixed charge)
   ☐ None   ☐ Yes → name ____________ , ₹______ /month, since (month/year) ________.
7. **Any expenses already spent in July 2026** you want logged now? (list: category · amount · short remark · date)
   - ________________________________________________
   - ________________________________________________

---

## E. UPI payment (for the public "Pay" button)

8. **UPI ID / VPA** (e.g. `9876543210@okhdfcbank` or `name@paytm`): ____________________
9. **Payee name to display:** ____________________ (default: "Gurucharni Apartment")
10. Prefer to give a **QR image** instead of a UPI ID? ☐ Yes (send the image) ☐ No, use the ID above.

---

### That's everything I need to fully populate and correctly test the system.
Sections **A + B** are the must-haves; C/D/E can follow if not ready.
