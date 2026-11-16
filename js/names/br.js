// ═══════════════════════════════════════════════════
//  PERSON AND COMPANY NAME DETECTION — Brazilian contracts
//
//  Pure module: no DOM, no globals. Exposes a detector function
//  `(text) => findings` for `detectSensitiveData(text, regexDb, detectors)`.
//
//  Names are found through contract anchors (role label with ":", civil
//  qualification, form of address, signature block, CPF/RG neighbourhood,
//  witness list), then propagated to every other occurrence in the document.
//  Sequences with no anchor are reported only when they start with a known
//  first name (IBGE lexicon). A role word with no ":" is a defined term, never
//  a label.
// ═══════════════════════════════════════════════════
import { PRENOMES } from '../data/prenomes-br.js';
import {
  END, LOW, UP, WORD_SRC, MAX_NAME_WORDS,
  isNameLine, isNameWord, isParticle, isSuffix, matchNameAt, nameWords, normalize, PARTICLES,
} from './shape.js';

const PERSON_REPLACEMENT = '[NOME OCULTADO]';
const COMPANY_REPLACEMENT = '[EMPRESA OCULTADA]';

// ── Roles ──────────────────────────────────────────
// One list (masculine singular, accent-free, upper case) feeds both the label
// anchor ("LOCADOR:") and the signature anchor (a line holding only "Locador").
// Feminine and plural forms are derived by suffix.
const ROLE_STEMS = [
  'LOCADOR', 'LOCATARIO', 'CONTRATANTE', 'CONTRATADO', 'COMPRADOR', 'VENDEDOR',
  'CEDENTE', 'CESSIONARIO', 'FIADOR', 'AVALISTA', 'CREDOR', 'DEVEDOR',
  'PROCURADOR', 'TESTEMUNHA', 'OUTORGANTE', 'OUTORGADO', 'MANDANTE', 'MANDATARIO',
  'INTERVENIENTE', 'ANUENTE', 'EMPREGADOR', 'EMPREGADO', 'PROMITENTE', 'PROMISSARIO',
  'SUBLOCADOR', 'SUBLOCATARIO', 'COMODANTE', 'COMODATARIO', 'DONATARIO', 'DOADOR',
  'GARANTIDOR', 'DEPOSITANTE', 'DEPOSITARIO',
  // Carried over from the legacy `nome_label` rule so non-contract documents
  // keep their labels.
  'PACIENTE', 'REQUERENTE', 'AUTOR', 'TITULAR', 'BENEFICIARIO', 'RESPONSAVEL',
  'REPRESENTANTE', 'CONJUGE', 'GENITOR', 'FILHO', 'REQUERIDO',
];
// Irregular forms that suffix rules cannot derive.
const ROLE_EXTRA = ['REU', 'REA', 'REUS', 'REAS', 'MAE', 'MAES', 'PAI', 'PAIS', 'GENITORA', 'FILHA'];

function roleForms(stem) {
  if (stem.endsWith('OR')) return [stem, `${stem}A`, `${stem}ES`, `${stem}AS`];
  if (stem.endsWith('O')) { const b = stem.slice(0, -1); return [stem, `${b}A`, `${b}OS`, `${b}AS`]; }
  if (stem.endsWith('A')) { const b = stem.slice(0, -1); return [stem, `${b}O`, `${stem}S`, `${b}OS`]; }
  if (stem.endsWith('E')) return [stem, `${stem}S`];
  return [stem];
}

const ROLE_SET = new Set([...ROLE_STEMS.flatMap(roleForms), ...ROLE_EXTRA]);
const ROLE_ALT = [...ROLE_SET].sort((a, b) => b.length - a.length).join('|');
const ROLE_SEQ = `(?:${ROLE_ALT})(?:[ \\t]+(?:${ROLE_ALT})){0,2}`;

// Words that start a sentence or clause and are not part of a name or company
// when they sit right before one ("Comparece Maria ...", "Entre ALFA ... LTDA").
const LEADING_NOISE = new Set([
  'ENTRE', 'EM', 'COM', 'CONTRA', 'PARA', 'PELO', 'PELA', 'PELOS', 'PELAS', 'COMPARECE',
  'COMPARECEM', 'SENDO', 'FICA', 'SAO', 'SERA', 'ASSIM', 'CONFORME', 'SEGUNDO', 'PERANTE',
  'JUNTO', 'AO', 'NO', 'NA', 'NOME', 'ALEM', 'POR', 'DE', 'DA', 'DO',
]);

// ── Qualification vocabulary (accent-free, upper case) ──
// `-o/-a/(a)` forms with an optional plural.
const g = (stem) => `${stem}(?:[OA]S?|O\\(A\\))`;
const QUALIFIER = [
  g('BRASILEIR'), g('ESTRANGEIR'), g('SOLTEIR'), g('CASAD'), g('DIVORCIAD'), g('VIUV'),
  g('SEPARAD'), 'MAIORES?', 'CAPAZ', 'PORTADOR(?:ES?|AS?|\\(A\\))?', g('INSCRIT'), 'CPF', 'RG',
].join('|');
const COMPANY_QUALIFIER = `PESSOA[ \\t]+JURIDICA|${g('INSCRIT')}[ \\t]+(?:NO|NA)[ \\t]+CNPJ`;
const companyQualRe = new RegExp(`^[ \\t]*,[ \\t]*(?:${COMPANY_QUALIFIER})(?![A-Z])`);

// ── Company grammar ────────────────────────────────
const SUFFIX_TOKEN =
  `(?:LTDA|Ltda|EIRELI|Eireli|EPP|MEI|ME|SLU|SA|S\\/A|S\\/S|S\\.A\\.|S\\.A(?![\\w.]))`;
const suffixRe = new RegExp(`${SUFFIX_TOKEN}(?![${UP}${LOW}0-9])`, 'y');
const companyWordRe = new RegExp(`${WORD_SRC}${END}`, 'y');
const initialRe = new RegExp(`[${UP}]\\.(?![${UP}${LOW}])`, 'y');
const alnumRe = /\d[\dA-Za-z]*(?![A-Za-zÀ-ÿ0-9])/y;
const connectorRe = /(?:de|da|do|dos|das|e|em|DE|DA|DO|DOS|DAS|E|EM|&)(?![A-Za-zÀ-ÿ0-9])/y;
const SEP_RE = /[ \t]+/y;

function stickyAt(re, line, pos) {
  re.lastIndex = pos;
  const m = re.exec(line);
  return m ? m[0] : null;
}

/**
 * Match a company name (words, connectors, `&`, digits, ending in a corporate
 * suffix) starting exactly at `pos`.
 * @returns {{end: number, words: number}|null}
 */
function matchCompanyAt(line, pos, minWords) {
  let p = pos;
  let words = 0;
  let prevConnector = false;
  for (;;) {
    let tok;
    if (words >= minWords && !prevConnector && (tok = stickyAt(suffixRe, line, p))) {
      return { end: p + tok.length, words };
    }
    if ((tok = stickyAt(companyWordRe, line, p)) || (tok = stickyAt(initialRe, line, p))
        || (tok = stickyAt(alnumRe, line, p))) {
      words++;
      prevConnector = false;
    } else if ((tok = stickyAt(connectorRe, line, p)) && words > 0 && !prevConnector) {
      prevConnector = true;
    } else {
      return null;
    }
    p += tok.length;
    if (!stickyAt(SEP_RE, line, p)) return null;
    p += stickyAt(SEP_RE, line, p).length;
  }
}

// ── Line model ─────────────────────────────────────
// A leading `## ` (heading marker added by the Markdown conversion) is ignored
// when evaluating anchors and never becomes part of a finding.
function toLines(text) {
  const lines = [];
  let offset = 0;
  for (const raw of text.split('\n')) {
    const full = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const marker = /^##[ \t]+/.exec(full);
    const shift = marker ? marker[0].length : 0;
    const body = full.slice(shift);
    lines.push({ body, norm: normalize(body), start: offset + shift, offset, heading: shift > 0, index: lines.length });
    offset += raw.length + 1;
  }
  return lines;
}

const isBlank = (line) => line.body.trim() === '';

// ── Prenome lexicon ────────────────────────────────
function makeIsPrenome(prenomes) {
  return (word) => {
    const n = normalize(word);
    return prenomes.has(n) || prenomes.has(n.split(/['’-]/)[0]);
  };
}

const DOC_WORDS = new Set([
  'CPF', 'RG', 'CNPJ', 'CNH', 'OAB', 'CRM', 'CREA', 'PIS', 'PASEP', 'NIT', 'CTPS', 'RENAVAM', 'IE',
]);

// ── Candidates ─────────────────────────────────────
// A candidate is `{ kind: 'person'|'company', start, value, confidence, anchor }`.
const rank = { high: 2, medium: 1, low: 0 };

function createCollector(text, lines) {
  const list = [];
  return {
    list,
    text,
    lines,
    add(line, rel, value, kind, confidence, anchor) {
      if (kind === 'person') {
        // Document label words (CPF, RG, ...) are never part of a name: cut the
        // value before the first one, and drop it if fewer than two words remain.
        const toks = [...value.matchAll(/\S+/g)];
        const cut = toks.findIndex((t) => DOC_WORDS.has(normalize(t[0])));
        if (cut !== -1) {
          value = value.slice(0, toks[cut].index).trimEnd();
          if (!/\S+\s+\S/.test(value)) return;
        }
      }
      const item = { kind, start: line.start + rel, value, confidence, anchor };
      list.push(item);
      return item;
    },
  };
}

// ── Continuation on the next line (D14) ──
// A name in running text that reaches the end of a line goes on in the name
// words that open the next text line, with at most one blank line between.
// pdf.js puts each visual PDF line on its own text line and justified
// paragraphs break names, so without this only the first part would be hidden.
const MARKER_RE = /^(?:(?:\d{1,2}|[a-zA-Z])[.)º°][ \t]+|[-*•–—][ \t]+)/;
const PARTICLE_TAIL_RE = new RegExp(
  `^(?:[ \\t]+(?:${PARTICLES.join('|')}|${PARTICLES.map((q) => q.toUpperCase()).join('|')}))*[ \\t]*$`);

// Lines that must not be joined to a name on the line before: role word, label
// with ':', list marker, dashed line or page separator.
function startsExcluded(line) {
  const t = line.body.trimStart();
  if (!t) return true;
  const first = normalize(t.split(/[ \t]+/)[0]).replace(/[^A-Z]/g, '');
  return ROLE_SET.has(first) || LABEL_START_RE.test(normalize(t)) || MARKER_RE.test(t)
    || DASHES_RE.test(t.trim()) || /^-{3,}$/.test(t.trim());
}

// Next non-blank line after `i`, skipping at most one blank line.
function followingLine(lines, i) {
  for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
    if (lines[j].body.trim() !== '') return lines[j];
  }
  return null;
}

// What may follow the continuation for it to count as the rest of the name:
// a comma and a qualification or document label.
const CONTINUATION_TAIL_RE = new RegExp(
  `^[ \\t]*,[ \\t]*(?:${QUALIFIER}|CNPJ|CNH|OAB)(?![A-Z])`);

/**
 * The continuation of a name onto the next line, or null when there is none:
 * `{ end, indicated }` with the absolute end of the joined name. `indicated`
 * says whether there is evidence the name was incomplete on its first line
 * (a pending particle, fewer than two words, a qualification or document label
 * right after, the continuation ending its line or the sentence). Without it
 * the caller keeps the name to the end of its first line, unless the full name
 * is confirmed elsewhere in the document.
 * `startRel`/`endRel` delimit the name already found inside `line.body`.
 */
function extendForward(out, line, startRel, endRel, wordsSoFar) {
  if (line.heading) return null;
  // The first line holding only the name (signature block, stacked names) never continues.
  if (line.body.slice(0, startRel).trim() === '') return null;
  // Only trailing particles may remain on the line after the name.
  if (!PARTICLE_TAIL_RE.test(line.body.slice(endRel))) return null;
  const next = followingLine(out.lines, line.index);
  if (!next || next.heading || startsExcluded(next)) return null;

  let words = wordsSoFar;
  let lastEnd = -1;
  const re = /[^ \t]+/g;
  let m;
  while ((m = re.exec(next.body)) !== null) {
    const text = m[0];
    const trailing = isSuffix(text) ? null : TOKEN_TRAILING_RE.exec(text);
    const core = trailing ? text.slice(0, -trailing[0].length) : text;
    if (isNameWord(core)) {
      if (words === MAX_NAME_WORDS) break;
      if (!isSuffix(core)) words++;
      lastEnd = m.index + core.length;
      if (trailing) break;
    } else if (isParticle(core) && !trailing) {
      continue;
    } else {
      break;
    }
  }
  if (lastEnd === -1) return null;
  const tail = next.body.slice(lastEnd);
  const indicated = line.body.slice(endRel).trim() !== ''
    || wordsSoFar < 2
    || CONTINUATION_TAIL_RE.test(normalize(tail))
    || tail.trim() === ''
    || /^[.;)]/.test(tail);
  return { end: next.start + lastEnd, indicated };
}

/**
 * Classify the name captured at `pos`: company when it ends in a corporate
 * suffix or is followed by a legal-entity qualification, person otherwise.
 * @returns {{kind: string, len: number}|null}
 */
function captureAt(line, pos) {
  const company = matchCompanyAt(line.body, pos, 1);
  if (company) return { kind: 'company', len: company.end - pos };
  const name = matchNameAt(line.body, pos);
  if (!name) return null;
  const rest = line.norm.slice(pos + name.length);
  return { kind: companyQualRe.test(rest) ? 'company' : 'person', len: name.length };
}

/**
 * Name tokens at the end of the previous text line (one blank line allowed),
 * for a name that started there and goes on in `line` (D14, backwards).
 */
function tokensBefore(out, line, wordsSoFar) {
  if (line.heading || startsExcluded(line)) return [];
  let prev = out.lines[line.index - 1];
  if (prev && prev.body.trim() === '') prev = out.lines[line.index - 2];
  if (!prev || prev.heading || prev.body.trim() === '') return [];
  const all = [];
  const re = /[^ \t]+/g;
  let m;
  while ((m = re.exec(prev.body)) !== null) all.push({ text: m[0], start: prev.start + m.index });
  const taken = [];
  let words = wordsSoFar;
  for (let k = all.length - 1; k >= 0; k--) {
    const t = all[k].text;
    if (isParticle(t) || isSuffix(t)) { taken.unshift(all[k]); continue; }
    if (!isNameWord(t) || DOC_WORDS.has(normalize(t)) || words === MAX_NAME_WORDS) break;
    words++;
    taken.unshift(all[k]);
  }
  // A previous line made only of the name never continues.
  if (taken.length === all.length) return [];
  return taken;
}

/**
 * The name that ends exactly at `end` (exclusive), extended to the left while
 * tokens are name words, particles or suffixes. Leading particles, role words,
 * clause openers and a first word that is not a first name (when the next one
 * is) are dropped.
 * @returns {{start: number, value: string}|null}
 */
function nameBefore(out, line, end, isPrenome, usePrenome = true, back = false) {
  const head = line.body.slice(0, end);
  const tokens = [];
  const re = /[^ \t]+/g;
  let m;
  while ((m = re.exec(head)) !== null) tokens.push({ text: m[0], start: line.start + m.index });

  let words = 0;
  let i = tokens.length;
  while (i > 0) {
    const t = tokens[i - 1].text;
    if (isParticle(t) || isSuffix(t)) { i--; continue; }
    if (!isNameWord(t) || DOC_WORDS.has(normalize(t))) break;
    if (words === MAX_NAME_WORDS) break;
    words++;
    i--;
  }
  let run = tokens.slice(i);
  if (back && i === 0 && run.length) run = [...tokensBefore(out, line, words), ...run];

  // Leading particles and suffixes cannot start a name.
  while (run.length && (isParticle(run[0].text) || isSuffix(run[0].text))) run.shift();

  const wordList = () => run.filter((t) => !isParticle(t.text) && !isSuffix(t.text));
  for (;;) {
    const w = wordList();
    if (w.length < 2) return null;
    const first = normalize(w[0].text);
    const dropFirst = ROLE_SET.has(first) || LEADING_NOISE.has(first)
      || (usePrenome && !isPrenome(w[0].text) && isPrenome(w[1].text));
    if (!dropFirst) break;
    run = run.slice(run.indexOf(w[0]) + 1);
    while (run.length && (isParticle(run[0].text) || isSuffix(run[0].text))) run.shift();
  }
  const first = run[0];
  const last = run[run.length - 1];
  return { start: first.start - line.start, value: out.text.slice(first.start, last.start + last.text.length) };
}

// ── Anchors ────────────────────────────────────────
const LABEL_RE = new RegExp(
  `(?<![A-Z0-9])(?:${ROLE_SEQ}|NOME(?:[ \\t]+(?:COMPLETO|SOCIAL|D[AO][ \\t]+(?:MAE|PAI)))?)` +
  `(?:[ \\t]*\\([A-Z]+\\))?[ \\t]*:[ \\t]*`, 'g');

const LABEL_START_RE = new RegExp(`^${LABEL_RE.source}`);

// Add a name captured at `pos`; a person name that reaches the end of the line
// goes on in the next one.
function addCaptured(out, line, pos, cap, confidence, anchor) {
  let end = line.start + pos + cap.len;
  let pendingEnd = null;
  if (cap.kind === 'person') {
    const words = nameWords(line.body.substr(pos, cap.len)).length;
    const ext = extendForward(out, line, pos, pos + cap.len, words);
    if (ext && ext.indicated) end = ext.end;
    else if (ext) pendingEnd = ext.end;
  }
  const item = out.add(line, pos, out.text.slice(line.start + pos, end), cap.kind, confidence, anchor);
  if (item && pendingEnd !== null) item.pendingEnd = pendingEnd;
}

function anchorLabel(line, out) {
  for (const m of line.norm.matchAll(LABEL_RE)) {
    const pos = m.index + m[0].length;
    const cap = captureAt(line, pos);
    if (cap) addCaptured(out, line, pos, cap, 'high', 'rotulo');
  }
}

const QUALIFICATION_RE = new RegExp(
  `,[ \\t]*(?:(${COMPANY_QUALIFIER})|(?:${QUALIFIER}))(?![A-Z])`, 'g');

function anchorQualification(line, out, isPrenome) {
  for (const m of line.norm.matchAll(QUALIFICATION_RE)) {
    const kind = companyQualRe.test(line.norm.slice(m.index)) ? 'company' : 'person';
    // The first-name rule only makes sense for people.
    const name = nameBefore(out, line, m.index, isPrenome, kind === 'person', kind === 'person');
    if (!name) continue;
    out.add(line, name.start, name.value, kind, 'high', 'qualificacao');
  }
}

const TREATMENT_RE =
  /(?<![A-Z])(?:SRA?|SRTA|DRA?|PROFA?)\.?[ \t]+|REPRESENTAD(?:[OA]S?|O\(A\))[ \t]+POR[ \t]+(?:(?:SEU|SUA)[ \t]+)?/g;

function anchorTreatment(line, out) {
  for (const m of line.norm.matchAll(TREATMENT_RE)) {
    const pos = m.index + m[0].length;
    const cap = captureAt(line, pos);
    if (cap) addCaptured(out, line, pos, cap, 'high', 'tratamento');
  }
}

const DASHES_RE = /^(?:_{3,}|-{4,}|\.{5,}|[—–]{2,})$/;
const ROLE_LINE_RE = new RegExp(`^\\(?${ROLE_SEQ}\\)?:?$`);

function nextNonBlank(lines, i, limit) {
  for (let j = i + 1; j <= i + limit && j < lines.length; j++) {
    if (!isBlank(lines[j])) return j;
  }
  return -1;
}

// A line that is only a name (or only a company), as [relStart, length].
function wholeLineName(line) {
  const trimmed = line.body.trim();
  if (!trimmed) return null;
  const rel = line.body.indexOf(trimmed);
  const company = matchCompanyAt(line.body, rel, 1);
  if (company && company.end === rel + trimmed.length) return { rel, len: trimmed.length, kind: 'company' };
  if (!isNameLine(trimmed)) return null;
  return { rel, len: trimmed.length, kind: 'person' };
}

function anchorSignature(lines, out, isPrenome) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DASHES_RE.test(line.body.trim())) {
      const j = nextNonBlank(lines, i, 2);
      if (j === -1) continue;
      const hit = wholeLineName(lines[j]);
      if (hit) out.add(lines[j], hit.rel, lines[j].body.substr(hit.rel, hit.len), hit.kind, 'high', 'assinatura');
      continue;
    }
    const next = lines[i].body.trim() === '' ? null : followingLine(lines, i);
    if (next && ROLE_LINE_RE.test(next.norm.trim())) {
      const hit = wholeLineName(line);
      // Without dashes before it, the line must start with a known first name
      // (a title followed by a role line is not a signature). With dashes, the
      // dashed-line branch above already reported it.
      if (hit && isPrenome(line.body.substr(hit.rel, hit.len).split(/[ \t]+/)[0])) out.add(line, hit.rel, line.body.substr(hit.rel, hit.len), hit.kind, 'high', 'assinatura');
    }
  }
}

// Fires only on an actual document number: a CPF/RG label followed by digits
// in CPF or RG shape, or a formatted CPF with no label. A bare label word
// (for example a table header) is not an anchor.
const DOC_NUMBER = '\\d{1,3}(?:\\.?\\d{3}){2}[-.]?[\\dX]{1,2}';
const DOCUMENT_RE = new RegExp(
  `(?<![A-Z0-9])(?:(?:CPF|RG)(?![A-Z])[ \\t]*(?:SOB[ \\t]+O[ \\t]+)?(?:N[º°O]?\\.?)?[ \\t]*:?[ \\t]*(?=${DOC_NUMBER})` +
  `|(?=\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}(?![\\d])))`, 'g');

function anchorDocument(line, out, isPrenome) {
  for (const m of line.norm.matchAll(DOCUMENT_RE)) {
    // Skip the separator between the name and the document label.
    const head = line.body.slice(0, m.index);
    const end = head.replace(/[ \t]*[–—\-,(:]?[ \t]*$/, '').length;
    const name = nameBefore(out, line, end, isPrenome);
    if (name) out.add(line, name.start, name.value, 'person', 'medium', 'documento');
  }
}

const WITNESS_HEAD_RE = /^(?:\d+[.)][ \t]*)?TESTEMUNHAS?[ \t]*:?[ \t]*$/;
const ITEM_RE = /^[ \t]*(?:\d{1,2}|[a-zA-Z])[.)º°-][ \t]*/;

function anchorWitnesses(lines, out) {
  for (let i = 0; i < lines.length; i++) {
    if (!WITNESS_HEAD_RE.test(lines[i].norm.trim())) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (isBlank(lines[j])) continue;
      const item = ITEM_RE.exec(lines[j].body);
      if (!item) break;
      const cap = captureAt(lines[j], item[0].length);
      if (cap) addCaptured(out, lines[j], item[0].length, cap, 'medium', 'testemunha');
    }
  }
}

// ── Company by corporate suffix (no anchor) ──
function anchorCompanySuffix(line, out) {
  const re = /[^ \t]+/g;
  let m;
  let lastEnd = 0;
  while ((m = re.exec(line.body)) !== null) {
    if (m.index < lastEnd) continue;
    const hit = matchCompanyAt(line.body, m.index, 2);
    if (!hit) continue;
    lastEnd = hit.end;
    // Drop role words and clause openers at the front, keeping at least two
    // words before the suffix.
    let start = m.index;
    const toks = [...line.body.slice(start, hit.end).matchAll(/[^ \t]+/g)];
    let k = 0;
    while (k < toks.length - 2) {
      const n = normalize(toks[k][0]);
      if (!ROLE_SET.has(n) && !LEADING_NOISE.has(n)) break;
      k++;
    }
    start = m.index + toks[k].index;
    const value = line.body.slice(start, hit.end);
    const innerWords = toks.slice(k).filter((t) => !isParticle(t[0]) && t[0] !== '&').length - 1;
    if (innerWords < 2) continue;
    out.add(line, start, value, 'company', 'high', 'sufixo');
  }
}

// ── Sequences with no anchor ───────────────────────
const TOKEN_TRAILING_RE = /[.,;:!?)\]"”]+$/;
const TOKEN_LEADING_RE = /^[("“\[]+/;

function anchorLexicon(line, out, isPrenome) {
  const re = /[^ \t]+/g;
  let run = [];
  const flush = () => {
    // Particles cannot start or end a name.
    while (run.length && (isParticle(run[0].core) || isSuffix(run[0].core))) run.shift();
    while (run.length && isParticle(run[run.length - 1].core)) run.pop();
    const words = run.filter((t) => !isParticle(t.core) && !isSuffix(t.core));
    if (words.length >= 2 && words.length <= MAX_NAME_WORDS && isPrenome(words[0].core)) {
      const first = run[0];
      const last = run[run.length - 1];
      const lastWord = words[words.length - 1];
      let end = line.start + last.end;
      let total = words.length;
      let pendingEnd = null;
      // The name may go on in the next line; leftover particles stay in the span.
      const ext = extendForward(out, line, first.start, lastWord.end, words.length);
      if (ext && ext.indicated) {
        end = ext.end;
        total = nameWords(out.text.slice(line.start + first.start, end)).length;
      } else if (ext) {
        pendingEnd = ext.end;
      }
      const item = out.add(line, first.start, out.text.slice(line.start + first.start, end),
        'person', total >= 3 ? 'medium' : 'low', 'lexico');
      if (item && pendingEnd !== null) item.pendingEnd = pendingEnd;
    }
    run = [];
  };
  let m;
  while ((m = re.exec(line.body)) !== null) {
    let text = m[0];
    let start = m.index;
    const leading = TOKEN_LEADING_RE.exec(text);
    if (leading) { flush(); text = text.slice(leading[0].length); start += leading[0].length; }
    let core = text;
    let breaks = false;
    // `Jr.` keeps its dot; any other trailing punctuation closes the run.
    if (!isSuffix(text)) {
      const trailing = TOKEN_TRAILING_RE.exec(text);
      if (trailing) { core = text.slice(0, -trailing[0].length); breaks = true; }
    }
    if (isNameWord(core) || isParticle(core) || isSuffix(core)) {
      run.push({ core, start, end: start + core.length });
      if (breaks) flush();
    } else {
      flush();
    }
  }
  flush();
}

// ── Propagation ────────────────────────────────────
// Between words: spaces, or a line break (one blank line allowed) per D14.
const WORD_GAP = '(?:[ \\t]+|[ \\t]*\\r?\\n(?:[ \\t]*\\r?\\n)?[ \\t]*)';

// An occurrence that spans lines counts only if every break obeys the
// continuation rules: no heading on either line, the first line is not made of
// the name alone, the next line does not open with a role, label, marker or dashes.
function breaksAllowed(text, lines, start, seg) {
  if (!seg.includes('\n')) return true;
  let lo = 0, hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].offset <= start) lo = mid; else hi = mid - 1;
  }
  const parts = seg.split('\n').map((t, k) => ({ idx: lo + k, text: t.replace(/\r$/, '').trim() }))
    .filter((q) => q.text !== '');
  for (let k = 0; k + 1 < parts.length; k++) {
    const a = lines[parts[k].idx];
    const b = lines[parts[k + 1].idx];
    if (a.heading || b.heading) return false;
    if (a.body.trim() === parts[k].text) return false;
    if (startsExcluded(b)) return false;
  }
  return true;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function propagate(text, candidates, lines) {
  // Distinct confirmed values (high or medium), keyed by normalized text.
  const groups = new Map();
  for (const c of candidates) {
    if (c.confidence === 'low') continue;
    const key = normalize(c.value).replace(/\s+/g, ' ');
    const g = groups.get(key);
    if (!g) groups.set(key, { kind: c.kind, confidence: c.confidence, value: c.value });
    else if (rank[c.confidence] > rank[g.confidence]) g.confidence = c.confidence;
  }

  const normText = normalize(text);
  const taken = new Map(candidates.map((c) => [`${c.start}:${c.value.length}`, c.confidence]));
  const added = [];
  for (const [key, g] of groups) {
    const body = key.split(' ').map((w) => escapeRe(w).replace(/['’]/g, `['’]`)).join(WORD_GAP);
    const re = new RegExp(`(?<![A-Z0-9])${body}(?![A-Z0-9])`, 'g');
    for (const m of normText.matchAll(re)) {
      // An occurrence already reported at this confidence or higher stays as is.
      const have = taken.get(`${m.index}:${m[0].length}`);
      if (have && rank[have] >= rank[g.confidence]) continue;
      if (!breaksAllowed(text, lines, m.index, m[0])) continue;
      added.push({
        kind: g.kind, start: m.index, value: text.substr(m.index, m[0].length),
        confidence: g.confidence, anchor: 'propagado',
      });
    }
  }
  return added;
}

// ── Detector ───────────────────────────────────────
function toFinding(c) {
  const company = c.kind === 'company';
  return {
    id: `${company ? 'empresa' : 'nome'}_${c.anchor}`,
    cat: company ? 'empresa' : 'nome',
    label: company ? 'Empresa' : 'Nome',
    value: c.value,
    index: c.start,
    length: c.value.length,
    replacement: company ? COMPANY_REPLACEMENT : PERSON_REPLACEMENT,
    confidence: c.confidence,
  };
}

/**
 * Build a detector function over a first-name lexicon.
 * @param {{prenomes?: Set<string>}} [options]  Normalized (accent-free, upper case) first names.
 * @returns {function(string): Array} `(text) => findings`
 */
export function createNameDetector({ prenomes = PRENOMES } = {}) {
  const isPrenome = makeIsPrenome(prenomes);

  return function detectNames(text) {
    const lines = toLines(text);
    const out = createCollector(text, lines);

    lines.forEach((line) => {
      anchorLabel(line, out);
      anchorQualification(line, out, isPrenome);
      anchorTreatment(line, out);
      anchorDocument(line, out, isPrenome);
      anchorCompanySuffix(line, out);
      anchorLexicon(line, out, isPrenome);
    });
    anchorSignature(lines, out, isPrenome);
    anchorWitnesses(lines, out);

    // One candidate per span: company beats person, higher confidence beats lower.
    const bySpan = new Map();
    for (const c of out.list) {
      const key = `${c.start}:${c.value.length}`;
      const prev = bySpan.get(key);
      if (!prev || (c.kind === 'company' && prev.kind !== 'company')
          || (c.kind === prev.kind && rank[c.confidence] > rank[prev.confidence])) {
        bySpan.set(key, c);
      }
    }
    let candidates = [...bySpan.values()];

    // A name cut at the end of its line because nothing showed it was
    // incomplete is joined after all when the full name is confirmed elsewhere.
    const confirmed = new Set(candidates
      .filter((c) => c.kind === 'person' && c.confidence !== 'low' && c.pendingEnd === undefined)
      .map((c) => normalize(c.value).replace(/\s+/g, ' ')));
    candidates = candidates.map((c) => {
      if (c.pendingEnd === undefined) return c;
      const full = text.slice(c.start, c.pendingEnd);
      return confirmed.has(normalize(full).replace(/\s+/g, ' ')) ? { ...c, value: full } : c;
    });

    // A value confirmed as a company anywhere is a company everywhere.
    const companyKeys = new Set(candidates
      .filter((c) => c.kind === 'company' && c.confidence !== 'low')
      .map((c) => normalize(c.value).replace(/\s+/g, ' ')));
    candidates = candidates.map((c) =>
      c.kind === 'person' && companyKeys.has(normalize(c.value).replace(/\s+/g, ' '))
        ? { ...c, kind: 'company' } : c);

    return [...candidates, ...propagate(text, candidates, lines)].map(toFinding);
  };
}

/** Detector over the bundled IBGE first-name lexicon. */
export const detectNames = createNameDetector();
