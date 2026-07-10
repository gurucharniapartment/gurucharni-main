import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'mr'

type Dict = Record<string, { en: string; mr: string }>

// All user-facing strings. Data (flat numbers, amounts) is never translated.
const STRINGS: Dict = {
  app_title: { en: 'Gurucharni Apartment', mr: 'गुरुचरणी अपार्टमेंट' },
  app_subtitle: { en: 'Maintenance Management', mr: 'देखभाल व्यवस्थापन' },

  available_balance: { en: 'Available in Bank', mr: 'बँकेत उपलब्ध' },
  in_bank_note: { en: 'Held in the building bank account', mr: 'इमारतीच्या बँक खात्यात' },
  totals_note: { en: 'Collected & spent are since July 2026 · dues as of today', mr: 'जमा व खर्च जुलै २०२६ पासून · थकबाकी आजची' },
  reports_cta_desc: { en: 'See where the money was spent, month by month', mr: 'महिन्यागणिक पैसा कुठे खर्च झाला ते पाहा' },
  pay: { en: 'Pay', mr: 'भरा' },
  pay_cta: { en: 'Pay Maintenance', mr: 'देखभाल भरा' },
  pay_cta_desc: { en: 'Pay for one or more months via UPI', mr: 'UPI द्वारे एक किंवा अधिक महिने भरा' },
  pay_page_title: { en: 'Pay Maintenance', mr: 'देखभाल भरा' },
  how_many_months: { en: 'How many months', mr: 'किती महिने' },
  you_owe: { en: 'You currently owe', mr: 'सध्याची थकबाकी' },
  choose_your_flat: { en: 'Choose your flat…', mr: 'तुमची सदनिका निवडा…' },
  select_flat_first: { en: 'Please select your flat first', mr: 'कृपया आधी तुमची सदनिका निवडा' },
  pay_dues: { en: 'Pay dues', mr: 'थकबाकी भरा' },
  pay_ahead: { en: 'Pay ahead', mr: 'आधीच भरा' },
  pay_outstanding: { en: 'Outstanding', mr: 'थकबाकी' },
  pay_this_month: { en: 'This month', mr: 'हा महिना' },
  pay_both: { en: 'Both', mr: 'दोन्ही' },
  clearing_outstanding: { en: 'Clearing outstanding dues', mr: 'थकबाकी भरत आहे' },
  paying_this_month: { en: 'This month', mr: 'या महिन्याचा' },
  paying_both: { en: 'Outstanding + this month', mr: 'थकबाकी + हा महिना' },
  no_payments_period: { en: 'No payments received in this period', mr: 'या कालावधीत पेमेंट मिळाले नाही' },
  upi_not_set: { en: 'UPI is not set up yet', mr: 'UPI अद्याप सेट केलेले नाही' },
  pay_via_upi: { en: 'Pay via UPI', mr: 'UPI द्वारे भरा' },
  scan_upi: { en: 'Scan with PhonePe, Google Pay, or any UPI app', mr: 'PhonePe, Google Pay किंवा कोणत्याही UPI अ‍ॅपने स्कॅन करा' },
  open_upi_app: { en: 'Open UPI app', mr: 'UPI अ‍ॅप उघडा' },

  // Sort / filter
  sort_by: { en: 'Sort', mr: 'क्रमवारी' },
  filter_by: { en: 'Show', mr: 'दाखवा' },
  sort_dues_first: { en: 'Dues first', mr: 'थकबाकी आधी' },
  sort_flat_asc: { en: 'Flat ↑', mr: 'सदनिका ↑' },
  sort_flat_desc: { en: 'Flat ↓', mr: 'सदनिका ↓' },
  sort_amount_desc: { en: 'Amount high→low', mr: 'रक्कम जास्त→कमी' },
  sort_amount_asc: { en: 'Amount low→high', mr: 'रक्कम कमी→जास्त' },
  filter_all: { en: 'All', mr: 'सर्व' },
  filter_due: { en: 'Due', mr: 'थकबाकी' },
  filter_grace: { en: 'Current month pending', mr: 'चालू महिना बाकी' },
  grace_short: { en: 'Current month', mr: 'चालू महिना' },
  hint_overdue: { en: 'past due', mr: 'थकीत' },
  hint_grace: { en: 'in grace', mr: 'सवलतीत' },
  hint_advance: { en: 'paid ahead', mr: 'पुढे भरले' },
  filter_advance: { en: 'Advance', mr: 'आधीच भरले' },
  filter_clear: { en: 'Paid', mr: 'भरले' },
  no_flats_match: { en: 'No flats match', mr: 'कोणतीही सदनिका जुळत नाही' },

  // Reports
  reports: { en: 'Reports', mr: 'अहवाल' },
  monthly_report: { en: 'Monthly Report', mr: 'मासिक अहवाल' },
  select_month: { en: 'Select month', mr: 'महिना निवडा' },
  custom_range: { en: 'Custom range', mr: 'सानुकूल कालावधी' },
  from: { en: 'From', mr: 'पासून' },
  to: { en: 'To', mr: 'पर्यंत' },
  spent_this_period: { en: 'Spent this period', mr: 'या कालावधीत खर्च' },
  collected_this_period: { en: 'Collected this period', mr: 'या कालावधीत जमा' },
  where_spent: { en: 'Where it was spent', mr: 'कुठे खर्च झाले' },
  no_expenses_period: { en: 'No expenses in this period', mr: 'या कालावधीत खर्च नाही' },
  back: { en: 'Back', mr: 'मागे' },

  // Export / reminders
  whatsapp: { en: 'WhatsApp', mr: 'व्हॉट्सअ‍ॅप' },
  share_pending_list: { en: 'Share pending list', mr: 'थकबाकी यादी पाठवा' },
  share_pending_hint: { en: 'Opens WhatsApp with the full list — pick your building group to post it in one tap.', mr: 'संपूर्ण यादीसह व्हॉट्सअ‍ॅप उघडते — तुमचा ग्रुप निवडून एका टॅपमध्ये पाठवा.' },
  export_csv: { en: 'Export CSV', mr: 'CSV निर्यात' },
  export_payments: { en: 'Payments', mr: 'पेमेंट' },
  export_expenses: { en: 'Expenses', mr: 'खर्च' },
  export_flats: { en: 'Flats', mr: 'सदनिका' },
  electricity_reminder: { en: 'Electricity bill for this month is not entered yet.', mr: 'या महिन्याचे वीज बिल अद्याप नोंदवलेले नाही.' },
  enter_now: { en: 'Enter now', mr: 'आता नोंदवा' },
  bank_opening: { en: 'Bank opening balance', mr: 'बँक प्रारंभिक शिल्लक' },
  set_bank_balance: { en: 'Set bank balance', mr: 'बँक शिल्लक सेट करा' },
  total_collected: { en: 'Total Collected', mr: 'एकूण जमा' },
  total_spent: { en: 'Total Spent', mr: 'एकूण खर्च' },
  total_dues: { en: 'Outstanding Dues', mr: 'थकबाकी' },

  flats: { en: 'Flats', mr: 'सदनिका' },
  flat: { en: 'Flat', mr: 'सदनिका' },
  residential: { en: 'Residential', mr: 'निवासी' },
  tenant_occupied: { en: 'Tenant', mr: 'भाडेकरू' },

  status_clear: { en: 'Paid', mr: 'भरले' },
  status_advance: { en: 'Advance', mr: 'आधीच भरले' },
  status_cooldown: { en: 'Please pay', mr: 'कृपया भरा' },
  status_due: { en: 'Due', mr: 'थकबाकी' },
  status_unconfigured: { en: 'Setup needed', mr: 'सेटअप आवश्यक' },

  paid_through: { en: 'Paid through', mr: 'यापर्यंत भरले' },
  due_label: { en: 'due', mr: 'थकबाकी' },
  in_grace: { en: 'current month pending', mr: 'चालू महिना बाकी' },
  total_advance: { en: 'Advance held', mr: 'आधीच भरलेले' },

  admin_login: { en: 'Admin Login', mr: 'प्रशासक लॉगिन' },
  logout: { en: 'Logout', mr: 'लॉगआउट' },
  email: { en: 'Email', mr: 'ईमेल' },
  password: { en: 'Password', mr: 'पासवर्ड' },
  login: { en: 'Login', mr: 'लॉगिन' },
  admin: { en: 'Admin', mr: 'प्रशासक' },

  // Admin
  flat_setup: { en: 'Flat setup', mr: 'सदनिका सेटअप' },
  record_payment: { en: 'Record payment', mr: 'पेमेंट नोंदवा' },
  add_expense: { en: 'Add expense', mr: 'खर्च जोडा' },
  monthly_charge: { en: 'Monthly charge (₹)', mr: 'मासिक शुल्क (₹)' },
  opening_position: { en: 'Current position', mr: 'सद्य स्थिती' },
  opening_due_amount: { en: 'Amount owed (₹)', mr: 'थकबाकी रक्कम (₹)' },
  advance_through: { en: 'Paid in advance through', mr: 'आधीच भरले यापर्यंत' },
  after_payment: { en: 'After payment', mr: 'पेमेंट नंतर' },
  pay_maintenance: { en: 'Maintenance', mr: 'देखभाल' },
  pay_clear_dues: { en: 'Clear dues', mr: 'थकबाकी भरा' },
  for_months: { en: 'For which months', mr: 'कोणत्या महिन्यांसाठी' },
  use_suggested: { en: 'Use suggested', mr: 'सुचवलेली रक्कम' },
  current_balance: { en: 'Current balance', mr: 'सद्य शिल्लक' },
  advance_short: { en: 'advance', mr: 'आधीच भरले' },
  flat_type_label: { en: 'Flat type', mr: 'सदनिका प्रकार' },
  effective_from: { en: 'Effective from', mr: 'पासून लागू' },
  months: { en: 'Months', mr: 'महिने' },
  amount: { en: 'Amount', mr: 'रक्कम' },
  remark: { en: 'Remark', mr: 'शेरा' },
  category: { en: 'Category', mr: 'श्रेणी' },
  date: { en: 'Date', mr: 'दिनांक' },
  note: { en: 'Note (optional)', mr: 'टीप (पर्यायी)' },
  save: { en: 'Save', mr: 'जतन करा' },
  cancel: { en: 'Cancel', mr: 'रद्द करा' },
  covers: { en: 'Covers', mr: 'व्याप्ती' },
  total: { en: 'Total', mr: 'एकूण' },
  recent_payments: { en: 'Recent payments', mr: 'अलीकडील पेमेंट' },
  recent_expenses: { en: 'Recent expenses', mr: 'अलीकडील खर्च' },
  money_in: { en: 'Money in', mr: 'जमा' },
  money_out: { en: 'Money out', mr: 'खर्च' },
  by_month: { en: 'By month', mr: 'महिन्यानुसार' },
  net: { en: 'Net', mr: 'निव्वळ' },
  month_col: { en: 'Month', mr: 'महिना' },
  transactions: { en: 'Transactions', mr: 'व्यवहार' },
  all_months: { en: 'All months', mr: 'सर्व महिने' },
  dues_cleared: { en: 'Dues cleared', mr: 'थकबाकी भरली' },
  delete: { en: 'Delete', mr: 'हटवा' },
  confirm_delete: { en: 'Permanently delete this entry? This cannot be undone.', mr: 'ही नोंद कायमची हटवायची? हे पूर्ववत करता येणार नाही.' },
  type_yes_to_delete: { en: 'Type "yes" to confirm deletion', mr: 'हटवण्यासाठी "yes" टाइप करा' },
  no_transactions: { en: 'No transactions yet', mr: 'अद्याप व्यवहार नाहीत' },
  void: { en: 'Void', mr: 'रद्द' },
  voided: { en: 'Voided', mr: 'रद्द केले' },
  no_records: { en: 'No records yet', mr: 'अद्याप नोंदी नाहीत' },
  select_flat: { en: 'Select flat', mr: 'सदनिका निवडा' },
  saved: { en: 'Saved', mr: 'जतन केले' },
  quick_actions: { en: 'Quick actions', mr: 'त्वरित क्रिया' },
  clear_baseline: { en: 'Clear (unconfigure)', mr: 'रिकामे करा' },
  confirm_void: { en: 'Void this record? It stays in history but is removed from all totals.', mr: 'ही नोंद रद्द करायची? ती इतिहासात राहील पण सर्व गणनेतून काढली जाईल.' },

  // Statement / receipt / audit
  account_statement: { en: 'Account Statement', mr: 'खाते उतारा' },
  monthly_maintenance: { en: 'Monthly maintenance', mr: 'मासिक देखभाल' },
  tanker_paid: { en: 'Paid tanker', mr: 'सशुल्क टँकर' },
  tanker_free: { en: 'Free tanker', mr: 'मोफत टँकर' },
  six_month_maintenance: { en: '6-month maintenance', mr: '६ महिन्यांची देखभाल' },
  opening_balance_row: { en: 'Opening balance', mr: 'प्रारंभिक शिल्लक' },
  maintenance_charge: { en: 'Maintenance', mr: 'देखभाल शुल्क' },
  payment_row: { en: 'Payment received', mr: 'पेमेंट मिळाले' },
  col_date: { en: 'Date', mr: 'दिनांक' },
  col_detail: { en: 'Detail', mr: 'तपशील' },
  col_charge: { en: 'Charge', mr: 'शुल्क' },
  col_paid: { en: 'Paid', mr: 'भरले' },
  col_balance: { en: 'Balance', mr: 'शिल्लक' },
  print_save_pdf: { en: 'Print / Save PDF', mr: 'प्रिंट / PDF' },
  receipt: { en: 'Receipt', mr: 'पावती' },
  receipts: { en: 'Receipts', mr: 'पावत्या' },
  receipt_admin_only: { en: 'Receipts are available to the admin only.', mr: 'पावत्या फक्त प्रशासकासाठी उपलब्ध आहेत.' },
  confirm_save: { en: 'Confirm & save', mr: 'पुष्टी करून जतन करा' },
  confirm_before_save: { en: 'Please review the details and confirm.', mr: 'कृपया तपशील तपासून पुष्टी करा.' },
  amount_mismatch_warn: { en: "Amount doesn't match the selected months", mr: 'रक्कम निवडलेल्या महिन्यांशी जुळत नाही' },
  share_image: { en: 'Share image', mr: 'प्रतिमा पाठवा' },
  payment_receipt: { en: 'Payment Receipt', mr: 'पेमेंट पावती' },
  receipt_no: { en: 'Receipt No.', mr: 'पावती क्र.' },
  received_from: { en: 'Received from', mr: 'यांच्याकडून' },
  amount_received: { en: 'Amount received', mr: 'मिळालेली रक्कम' },
  for_period: { en: 'For', mr: 'साठी' },
  computer_generated: { en: 'Computer-generated — no signature required', mr: 'संगणकाद्वारे तयार — स्वाक्षरी आवश्यक नाही' },
  share_whatsapp: { en: 'Share on WhatsApp', mr: 'WhatsApp वर पाठवा' },
  activity_log: { en: 'Activity log', mr: 'क्रियाकलाप नोंद' },
  owes_now: { en: 'Owes now', mr: 'सध्याची थकबाकी' },
  in_advance: { en: 'In advance', mr: 'आधीच भरले' },
  all_paid: { en: 'All paid', mr: 'सर्व भरले' },
  st_overdue: { en: 'Overdue', mr: 'मुदत उलटली' },
  st_grace: { en: 'Current month pending', mr: 'चालू महिना बाकी' },
  st_advance: { en: 'Paid in advance', mr: 'आधीच भरले' },
  st_paid_up: { en: 'Paid up', mr: 'भरले' },
  outstanding_before: { en: 'Outstanding (before this month)', mr: 'या महिन्यापूर्वीची थकबाकी' },
  this_month_charge: { en: 'This month', mr: 'या महिन्याचा' },
  total_now: { en: 'Total now', mr: 'सध्या एकूण' },
  paid_advance_through: { en: 'Paid in advance through', mr: 'आधीच भरले यापर्यंत' },
  paid_up_to: { en: 'Paid up to', mr: 'यापर्यंत भरले' },
  pay_by_10th: { en: 'Please pay soon to stay clear', mr: 'कृपया लवकर भरा' },
  last_payment: { en: 'Last payment', mr: 'शेवटचे पेमेंट' },
  col_name: { en: 'Name', mr: 'नाव' },
  nobody_owes: { en: 'No flats have outstanding dues', mr: 'कोणत्याही सदनिकेची थकबाकी नाही' },
  who_owes: { en: 'Who has dues', mr: 'कोणाची थकबाकी' },
  till: { en: 'till', mr: 'पर्यंत' },
  up_to: { en: 'up to', mr: 'यापर्यंत' },
  before_month: { en: 'before', mr: 'पूर्वीची' },
  status_col: { en: 'Status', mr: 'स्थिती' },
  cleared_title: { en: 'Cleared & paid ahead', mr: 'भरलेले व आधीच भरलेले' },
  no_cleared: { en: 'No flats are fully paid yet', mr: 'अद्याप कोणतीही सदनिका पूर्ण भरलेली नाही' },
  date_format_note: { en: 'Dates are shown in YYYY-MM-DD format', mr: 'दिनांक YYYY-MM-DD स्वरूपात दाखवले आहेत' },

  loading: { en: 'Loading…', mr: 'लोड होत आहे…' },
  error_loading: { en: 'Could not load data. Check your connection.', mr: 'डेटा लोड करता आला नाही. कनेक्शन तपासा.' },
  retry: { en: 'Retry', mr: 'पुन्हा प्रयत्न करा' },
  as_of: { en: 'As of', mr: 'दिनांक' },
  view_public: { en: 'Public View', mr: 'सार्वजनिक दृश्य' },
}

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof typeof STRINGS | string) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('lang') as Lang) || 'en',
  )
  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = (key: string) => STRINGS[key]?.[lang] ?? key
  const setLang = (l: Lang) => setLangState(l)

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
