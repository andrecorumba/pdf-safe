# PDF Safe — Sensitive Data Sanitizer

> Detect and redact PII from PDF documents entirely in your browser. No upload. No server. No tracking.

---

## Overview

PDF Safe is a client-side tool that extracts text from PDF files, automatically detects sensitive personal data, and lets you review and sanitize it before sharing. Every operation runs locally via WebAssembly — nothing ever leaves your machine.

Two editions are available:

| Edition | Regulation | Landing page | Sanitizer |
|---------|-----------|--------------|-----------|
| 🇧🇷 Brazil | LGPD | `index.html` | `pdf-safe-brazil.html` |
| 🇺🇸 United States | HIPAA / CCPA | `index-usa.html` | `pdf-safe-usa.html` |

---

## Features

- **Automatic detection** — regex-based rules with mathematical validation (CPF/CNPJ digits, SSN structure) to minimize false positives
- **Manual selection** — highlight any text with the mouse and add it as a finding, choosing category and replacement text
- **Review before redacting** — inspect every finding, dismiss false positives, restore dismissed items
- **Filter by category** — toggle visibility per data type (SSN, address, financial, etc.)
- **Three views** — highlighted text, raw Markdown, rendered preview
- **One-click redaction** — replaces all active findings in order, preserving document structure
- **Export** — download the sanitized text as a `.md` file or copy to clipboard
- **100% private** — processed with [PDF.js](https://mozilla.github.io/pdf.js/) in the browser; no backend, no account, works offline

---

## Detected Data Types

### 🇧🇷 Brazil edition (`pdf-safe-brazil.html`)

| Category | Examples |
|----------|---------|
| CPF | `123.456.789-09`, `12345678909`, `123456789-09` |
| CNPJ | `12.345.678/0001-95`, `12345678000195`, `12345678/0001-95` |
| RG | `12.345.678-9 SSP/SP` |
| CNH | context + 11-digit number |
| Título de Eleitor | `0000 0000 0000` |
| PIS / NIT | `000.00000.00-0` |
| Passaporte | `AB123456` |
| OAB / CRM / CREA | professional registrations |
| Placa veicular | old `ABC-1234` and Mercosul `ABC1D23` |
| RENAVAM | 9–11 digits with context |
| CEP | `00000-000` |
| Endereço | street addresses (Rua, Avenida, Alameda…) |
| Telefone | `(11) 91234-5678`, `0800-000-0000`, `+55` |
| E-mail | standard format |
| Nome | labeled (Nome:, Paciente:…) and ALL-CAPS |
| Financeiro | R$ amounts, agência, conta, PIX EVP, boleto |
| Data | `DD/MM/YYYY`, written form |
| Processo CNJ | `0000000-00.0000.0.00.0000` |
| Cartão SUS | CNS/MBI format |
| IE | Inscrição Estadual |

### 🇺🇸 United States edition (`pdf-safe-usa.html`)

| Category | Examples |
|----------|---------|
| SSN | `123-45-6789`, bare 9 digits (validated) |
| EIN | `12-3456789` |
| ITIN | `9XX-XX-XXXX` with context |
| Driver's License | labeled + alphanumeric pattern |
| Passport | `A12345678` |
| Medicare MBI | 11-character Medicare Beneficiary Identifier |
| NPI | 10-digit National Provider Identifier |
| Phone | `(555) 123-4567`, `+1 555 123 4567` |
| Email | standard format |
| ZIP Code | `12345`, `12345-6789` |
| Address | number + street name + type (St, Ave, Blvd…) |
| Credit/Debit Card | Visa, Mastercard, Amex, Discover |
| Routing Number | ABA 9-digit with context |
| Account Number | labeled bank account |
| Dollar Amount | `$1,234.56` |
| IP Address | IPv4 |
| VIN | 17-character Vehicle Identification Number |
| Date | `MM/DD/YYYY`, long-form, ISO 8601 |
| Name | labeled (Patient:, Subscriber:…) and ALL-CAPS |

---

## How It Works

1. **Open** — drag a PDF onto the upload zone or click to browse
2. **Extract** — PDF.js reads each page and converts to plain text / Markdown
3. **Detect** — regex rules scan the text; overlapping matches are resolved by position (longest/first wins)
4. **Review** — findings appear highlighted in the left panel and listed on the right; dismiss false positives with `−`
5. **Redact** — click **Redact All** to apply replacements from end to start (preserving indices); click again to undo
6. **Export** — download `.md` or copy to clipboard

---

## Project Structure

```
pdf-safe/
├── index.html            # Brazilian landing page (PT-BR)
├── index-usa.html        # US landing page (EN)
├── pdf-safe-brazil.html  # Brazilian PII sanitizer
└── pdf-safe-usa.html     # US PII sanitizer
```

No build step. No dependencies to install. Open any HTML file directly in a modern browser.

---

## Dependencies (CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| [PDF.js](https://mozilla.github.io/pdf.js/) | 3.11.174 | PDF parsing in the browser |
| [marked](https://marked.js.org/) | 9.1.6 | Markdown rendering in preview tab |
| Google Fonts | — | JetBrains Mono, DM Sans, Playfair Display |

---

## Privacy

- No server-side processing of any kind
- No analytics, no cookies, no external requests beyond CDN assets
- Files are read via the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) and never leave the browser tab
- Works fully offline once the CDN assets are cached

---

## License

MIT
