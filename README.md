# PDF Safe — Sensitive Data Anonymizer

> Detect and redact PII from PDF documents entirely in your browser. No upload. No server. No tracking.

---

## Overview

PDF Safe is a client-side tool that extracts text from PDF files, automatically detects sensitive personal data, and lets you review and anonymize it before sharing. Every operation runs locally via WebAssembly — nothing ever leaves your machine.

Two editions are available:

| Edition | Regulation | Landing page | App |
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
- **Export** — download the anonymized text as a `.md` file or copy to clipboard
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
| Nome | person names found through contract anchors (see [Name and company detection](#name-and-company-detection-brazil-edition)) |
| Empresa | company names (razão social) — its own category, with its own filter and `[EMPRESA OCULTADA]` replacement |
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

## Name and company detection (Brazil edition)

Names are not matched by a single pattern. The Brazil edition looks for **contract
anchors**: a role followed by `:` (`LOCADOR:`, `CONTRATANTE:`, `Nome da mãe:`), a civil
qualification to the right of the name (`, brasileira, solteira`, `, portador do RG`),
a form of address (`Sr.`, `Dra.`) or `representado(a) por`, the signature block, a name
next to a CPF/RG, and the witness list. Every confirmed name is then **propagated** to
its other occurrences in the document, in any case or accent. A role word with no `:`
(`O Locador entregará…`) is treated as a defined term and never as a label.

- **Name only** — a finding covers just the name. In `LOCADOR: JOÃO DA SILVA, brasileiro`
  only `JOÃO DA SILVA` becomes `[NOME OCULTADO]`; the label stays. (Before, the whole
  `Nome: Fulano` was replaced.)
- **Empresa** — a company name ending in a corporate suffix (`LTDA`, `S.A.`, `ME`, `EPP`…)
  or followed by `, pessoa jurídica` is reported in its own category.
- **Confidence** — every finding is *high*, *medium* or *low*. High and medium start
  active. Low confidence starts **dismissed** and is listed as a suggestion in the
  dismissed section; restore it if you want it redacted. When findings overlap, the
  higher confidence wins.
- **First-name lexicon** — a capitalized sequence with no anchor is reported only if its
  first word is a first name from a bundled list of about 1,600 frequent first names
  from the IBGE 2010 Census (`js/data/prenomes-br.js`, no network; the file header
  records source and cut-off): medium for three or more words, low for two.

Known limitations:

- A two-word name with no anchor (for example `João Silva` alone in running text) starts
  dismissed, because two-word sequences collide with place names and common phrases.
  Look in the dismissed section.
- A name whose first word is not in the lexicon (rare or foreign first names) is not
  found when it has no anchor. Anchored names do not depend on the lexicon.
- Partial variants of a name (first name only, or first name + last surname) are not
  propagated; only the full name is.
- Text whose accents are stored as separate combining characters (NFD) is not matched.
- The US edition is unchanged: all its rules report high confidence.

---

## How It Works

1. **Open** — drag a PDF onto the upload zone or click to browse
2. **Extract** — PDF.js reads each page and converts to plain text / Markdown
3. **Detect** — regex rules and function detectors scan the text; each finding carries a confidence level, and overlapping matches are resolved by confidence first, then by position (the first match reaching a position wins)
4. **Review** — findings appear highlighted in the left panel and listed on the right; dismiss false positives with `−`. Low-confidence findings start dismissed, marked as suggestions; restore the ones you want with `+`
5. **Redact** — click **Redact All** to apply replacements from end to start (preserving indices); click again to undo
6. **Export** — download `.md` or copy to clipboard

---

## Project Structure

```
pdf-safe/
├── index.html            # Brazilian landing page (PT-BR)
├── index-usa.html        # US landing page (EN)
├── pdf-safe-brazil.html  # Brazilian edition — thin shell
├── pdf-safe-usa.html     # US edition — thin shell
├── tests/                # node --test suites and synthetic contract fixtures
├── css/
│   ├── app.css           # styles for both editions
│   └── landing.css       # styles for both landing pages
└── js/
    ├── boot-br.js        # entry point: BR rules + pt-BR strings
    ├── boot-us.js        # entry point: US rules + en-US strings
    ├── app.js            # UI flow and state, shared by both editions
    ├── template.js       # app markup, written once
    ├── detector.js       # detectSensitiveData — pure, no DOM
    ├── names/            # person/company detection for the BR edition (pure)
    ├── data/             # prenomes-br.js — IBGE first-name lexicon
    ├── markdown.js       # convertToMarkdown — pure, no DOM
    ├── landing.js        # landing page behaviour
    ├── rules/            # br.js, us.js — regexes, categories, validators
    └── i18n/             # pt-BR.js, en-US.js — every UI string
```

Both editions run the same `app.js`; only the rule set and the string table differ.

### Running locally

There is no build step and nothing to install, but the app uses ES modules, so it
must be served over HTTP — opening the `.html` files directly via `file://` will not
work:

```bash
npx serve .          # or: python3 -m http.server
```

Then open <http://localhost:3000/index.html>. Deploying is just copying the
repository to any static host (GitHub Pages, Cloudflare Pages); relative paths and
the existing URLs are unchanged.

### Running the tests

The detection logic is plain ES modules and is tested with Node's built-in runner
(developed on Node 23; no dependencies to install):

```bash
npm test
```

Fixtures in `tests/fixtures/` are fully synthetic contracts (invented names, generated
CPFs/CNPJs with valid check digits). Never add real documents there.

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

This is enforced by the browser, not just promised:

- Every page declares a **Content Security Policy** with `connect-src 'none'`, so no
  script on the page can open a `fetch`, `XMLHttpRequest` or WebSocket to anywhere —
  document contents have no way out.
- The CDN libraries are pinned with **Subresource Integrity** hashes, so a tampered
  CDN response is refused by the browser instead of executed.

---

## License

MIT
