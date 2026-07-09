// Build a UPI deep link (no SDK). Opens the user's UPI app on mobile;
// the same string encodes into a scannable QR for desktop.
export function buildUpiUrl(opts: {
  vpa: string
  payee: string
  amount?: number
  note?: string
}): string {
  const parts = [
    `pa=${encodeURIComponent(opts.vpa)}`,
    `pn=${encodeURIComponent(opts.payee)}`,
    'cu=INR',
  ]
  if (opts.amount && opts.amount > 0) parts.push(`am=${opts.amount}`)
  if (opts.note) parts.push(`tn=${encodeURIComponent(opts.note)}`)
  return `upi://pay?${parts.join('&')}`
}
