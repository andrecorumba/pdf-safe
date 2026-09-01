// ═══════════════════════════════════════════════════
//  REGEX DATABASE — US PII Detection
// ═══════════════════════════════════════════════════

// ── SSN VALIDATOR (reduce false positives on bare numbers) ──
export function isValidSSN(ssn) {
  const d = ssn.replace(/\D/g, '');
  if (d.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(d)) return false;
  if (d.substring(0, 3) === '000') return false;
  if (d.substring(3, 5) === '00') return false;
  if (d.substring(5) === '0000') return false;
  return true;
}

export const REGEX_DB = [
  // ── SSN ──
  { id: 'ssn', cat: 'ssn', label: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: 'XXX-XX-XXXX' },
  { id: 'ssn_label', cat: 'ssn', label: 'SSN',
    regex: /(?:SSN|S\.?S\.?N\.?|Social\s*Security\s*(?:Number|No\.?|#)?)\s*[:–\-#]?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/gi,
    replacement: 'SSN: XXX-XX-XXXX', fullMatch: true },
  { id: 'ssn_plain', cat: 'ssn', label: 'SSN',
    regex: /\b\d{9}\b/g,
    replacement: 'XXX-XX-XXXX',
    validate: (m) => isValidSSN(m) },

  // ── EIN ──
  { id: 'ein', cat: 'ein', label: 'EIN',
    regex: /\b\d{2}-\d{7}\b/g,
    replacement: 'XX-XXXXXXX' },
  { id: 'ein_label', cat: 'ein', label: 'EIN',
    regex: /(?:EIN|E\.?I\.?N\.?|FEIN|Employer\s*(?:Identification|ID)\s*(?:Number|No\.?|#)?|Tax\s*ID)\s*[:–\-#]?\s*(\d{2}[-\s]?\d{7})/gi,
    replacement: 'EIN: XX-XXXXXXX', fullMatch: true },

  // ── ITIN ──
  { id: 'itin_label', cat: 'ssn', label: 'ITIN',
    regex: /(?:ITIN|I\.?T\.?I\.?N\.?|Individual\s*Taxpayer\s*Identification\s*(?:Number)?)\s*[:–\-#]?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/gi,
    replacement: 'ITIN: 9XX-XX-XXXX', fullMatch: true },

  // ── Driver's License ──
  { id: 'dl_label', cat: 'dl', label: "Driver's License",
    regex: /(?:Driver'?s?\s*Licen[sc]e|DL\b|D\.?L\.?|License\s*(?:Number|No\.?|#))\s*[:–\-#]?\s*([A-Z0-9]{1,2}[-\s]?[0-9]{4,9})/gi,
    replacement: "DL: XXXXXXXXX", fullMatch: true },

  // ── Passport ──
  { id: 'passport', cat: 'document', label: 'Passport',
    regex: /(?:Passport|Pass\.?)\s*[:–\-#No.]*\s*([A-Z]{1,2}[0-9]{7,9})/gi,
    replacement: 'Passport: XXXXXXXXX', fullMatch: true },

  // ── Medicare MBI ──
  { id: 'mbi', cat: 'document', label: 'Medicare',
    regex: /(?:Medicare|MBI|Beneficiary\s*(?:ID|Number|#))\s*[:–\-#]?\s*([1-9][A-Za-z][A-Za-z0-9]\d[A-Za-z][A-Za-z0-9]\d[A-Za-z][A-Za-z0-9]{2}\d{2})/gi,
    replacement: 'Medicare: XXXXXXXXXX', fullMatch: true },

  // ── NPI ──
  { id: 'npi', cat: 'document', label: 'NPI',
    regex: /(?:NPI|National\s*Provider\s*(?:Identifier|ID|Number))\s*[:–\-#]?\s*(\d{10})/gi,
    replacement: 'NPI: XXXXXXXXXX', fullMatch: true },

  // ── US Phone ──
  { id: 'phone_us', cat: 'phone', label: 'Phone',
    regex: /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/g,
    replacement: '(XXX) XXX-XXXX' },
  { id: 'phone_intl', cat: 'phone', label: 'Phone +1',
    regex: /(?:\+1|001)[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g,
    replacement: '+1 (XXX) XXX-XXXX' },

  // ── Email ──
  { id: 'email', cat: 'email', label: 'Email',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
    replacement: 'email@redacted.com' },

  // ── ZIP Code ──
  { id: 'zip', cat: 'zip', label: 'ZIP Code',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: 'XXXXX',
    validate: (m) => { const n = parseInt(m.substring(0, 5)); return !(n >= 1900 && n <= 2100); } },
  { id: 'zip_label', cat: 'zip', label: 'ZIP Code',
    regex: /(?:ZIP|Zip\s*Code|Postal\s*Code)\s*[:–\-]?\s*(\d{5}(?:-\d{4})?)/gi,
    replacement: 'ZIP: XXXXX', fullMatch: true },

  // ── Address ──
  { id: 'address', cat: 'address', label: 'Address',
    regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\.?\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct|Place|Pl|Terrace|Ter|Circle|Cir|Trail|Trl|Highway|Hwy|Parkway|Pkwy)\.?(?:\s+(?:Apt|Unit|Suite|Ste|Floor|Fl|#)\s*[\w\d]+)?/gi,
    replacement: '[ADDRESS REDACTED]' },
  { id: 'address_label', cat: 'address', label: 'Address',
    regex: /(?:Address|Addr\.?|Mailing\s*Address|Residence)\s*[:–\-]\s*[A-Za-z0-9\s.,#\-]{5,100}/gi,
    replacement: 'Address: [ADDRESS REDACTED]', fullMatch: true },

  // ── Credit/Debit Card ──
  { id: 'credit_card', cat: 'financial', label: 'Card Number',
    regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b/g,
    replacement: 'XXXX-XXXX-XXXX-XXXX' },
  { id: 'card_label', cat: 'financial', label: 'Card Number',
    regex: /(?:Card\s*(?:Number|No\.?|#)|Credit\s*Card|Debit\s*Card|CC\s*#?)\s*[:–\-]?\s*(\d[\d\s\-]{14,18}\d)/gi,
    replacement: 'Card: XXXX-XXXX-XXXX-XXXX', fullMatch: true },

  // ── Routing & Account ──
  { id: 'routing', cat: 'financial', label: 'Routing No.',
    regex: /(?:Routing\s*(?:Number|No\.?|#)|ABA\s*(?:Number|No\.?|#)?|Transit\s*(?:Number|No\.?))\s*[:–\-]?\s*(\d{9})/gi,
    replacement: 'Routing: XXXXXXXXX', fullMatch: true },
  { id: 'account', cat: 'financial', label: 'Account No.',
    regex: /(?:Account\s*(?:Number|No\.?|#)|Acct\.?\s*(?:No\.?|#)?)\s*[:–\-]?\s*(\d{6,17})/gi,
    replacement: 'Account: XXXXXXXXX', fullMatch: true },

  // ── Dollar Amounts ──
  { id: 'dollar', cat: 'financial', label: 'Amount',
    regex: /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
    replacement: '$X,XXX.XX' },

  // ── IP Address ──
  { id: 'ip_addr', cat: 'document', label: 'IP Address',
    regex: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}\b/g,
    replacement: 'XXX.XXX.XXX.XXX' },

  // ── VIN ──
  { id: 'vin', cat: 'document', label: 'VIN',
    regex: /(?:VIN|Vehicle\s*Identification\s*(?:Number)?)\s*[:–\-#]?\s*([A-HJ-NPR-Z0-9]{17})/gi,
    replacement: 'VIN: XXXXXXXXXXXXXXXXX', fullMatch: true },

  // ── Dates ──
  { id: 'date_us', cat: 'date', label: 'Date',
    regex: /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
    replacement: 'XX/XX/XXXX' },
  { id: 'date_long', cat: 'date', label: 'Date',
    regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:0?[1-9]|[12]\d|3[01]),?\s+(?:19|20)\d{2}\b/gi,
    replacement: 'XXXXXXXX XX, XXXX' },
  { id: 'date_iso', cat: 'date', label: 'Date (ISO)',
    regex: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
    replacement: 'XXXX-XX-XX' },

  // ── Names ──
  { id: 'name_label', cat: 'name', label: 'Name',
    regex: /(?:Name|Patient|Subscriber|Claimant|Beneficiary|Member|Insured|Applicant|Plaintiff|Defendant|Attorney|Guardian|Dependent|Spouse|Employee|Employer|Policyholder|Guarantor)(?!\w)\s*[:–\-]?\s*([A-Z][a-z]+(?:\s(?:[A-Z]\.?\s)?[A-Z][a-z]+){1,4})/gi,
    replacement_fn: (m) => m.replace(/[:–\-]?\s*[A-Z][a-z].*$/, ': [NAME REDACTED]'),
    fullMatch: true },
  { id: 'name_caps', cat: 'name', label: 'Name (CAPS)',
    regex: /\b[A-Z]{2,20}(?:\s[A-Z]{2,20}){1,4}\b/g,
    replacement: '[NAME REDACTED]',
    validate: (match) => {
      const words = match.trim().split(/\s+/);
      if (words.length < 2 || words.length > 5) return false;
      const skip = new Set(['THE','AND','FOR','LLC','INC','CORP','LTD','USA','MD','DO','RN','NP','PA',
        'DR','MR','MRS','MS','JR','SR','III','IV','HIPAA','COBRA','ERISA','CCPA','GDPR',
        'NORTH','SOUTH','EAST','WEST','STREET','AVENUE','SUITE','FLOOR','UNIT','DATE',
        'BIRTH','SERVICE','POLICY','CLAIM','MEDICAL','RECORD','ACCOUNT','SOCIAL','SECURITY',
        'UNITED','STATES','NEW','YORK','LOS','ANGELES','SAN','FRANCISCO','JANUARY','FEBRUARY',
        'MARCH','APRIL','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']);
      if (words.some(w => skip.has(w))) return false;
      return true;
    }
  },
];

// Category metadata.
//   label    — plural form, used in filter chips and the summary bar
//   singular — used on the type pill of manually added findings
//   option   — label in the manual-category dropdown (defaults to `singular`)
//   tone     — highlight / pill color role, defined in css/app.css
//   summary  — value color class in the summary bar
export const CATEGORIES = {
  ssn:       { label: 'SSN',           singular: 'SSN',              icon: '🪪',  tone: 'danger',  summary: 'sc-danger' },
  ein:       { label: 'EIN',           singular: 'EIN',              icon: '🏢', tone: 'purple',  summary: 'sc-danger' },
  dl:        { label: "Driver's Lic.", singular: "Driver's License", icon: '🚗', tone: 'warn',    summary: 'sc-warn' },
  name:      { label: 'Names',         singular: 'Name',             icon: '👤', tone: 'info',    summary: 'sc-info' },
  address:   { label: 'Address',       singular: 'Address',          icon: '📍', tone: 'cyan',    summary: 'sc-info' },
  zip:       { label: 'ZIP Code',      singular: 'ZIP Code',         icon: '📮', tone: 'success', summary: 'sc-success' },
  phone:     { label: 'Phone',         singular: 'Phone',            icon: '📞', tone: 'accent',  summary: 'sc-warn' },
  email:     { label: 'Email',         singular: 'Email',            icon: '📧', tone: 'pink',    summary: 'sc-warn' },
  financial: { label: 'Financial',     singular: 'Financial',        icon: '💰', tone: 'amber',   summary: 'sc-danger' },
  date:      { label: 'Dates',         singular: 'Date',             icon: '📅', tone: 'indigo',  summary: 'sc-info' },
  document:  { label: 'Documents',     singular: 'Document',         icon: '📋', tone: 'rose',    summary: 'sc-warn' },
  manual:    { label: 'Manual',        singular: 'Manual',           icon: '✏️', tone: 'slate',   summary: 'sc-info', option: 'Other' },
};

// Categories offered in the manual-selection dropdown, in display order.
export const MANUAL_CATEGORIES = [
  'ssn', 'ein', 'dl', 'name', 'address', 'email',
  'phone', 'financial', 'date', 'document', 'manual',
];

// Lines matching this pattern become Markdown headings.
export const headingPattern = /^([A-Z\s]{4,60})$/gm;
