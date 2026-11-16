// ═══════════════════════════════════════════════════
//  NAME SHAPE — case-sensitive grammar for person names
//
//  Pure module: no DOM, no globals. Shared by every name anchor.
//
//  A name word is capitalized (`Maria`) or all caps (`MARIA`); lowercase words
//  never count. Words are separated by spaces or tabs only, never by a line
//  break, so a match cannot run across lines. The grammar itself is
//  case-sensitive on purpose: roles and labels are matched case-insensitively
//  elsewhere, but the name that follows must still look like a name.
// ═══════════════════════════════════════════════════

// Explicit classes: `À-Ú` would also include the multiplication sign.
export const UP = 'A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
export const LOW = 'a-záàâãäéèêëíìîïóòôõöúùûüçñ';
const APOS = `['’]`;

// Capitalized: Maria, D'Ávila, Sant'Anna, Silva-Santos.
const CAP_WORD = `(?:[${UP}]${APOS})?[${UP}][${LOW}]+(?:${APOS}[${UP}][${LOW}]+)?(?:-[${UP}][${LOW}]+)*`;
// All caps: MARIA, D'ÁVILA, SILVA-SANTOS.
const UP_WORD = `(?:[${UP}]${APOS})?[${UP}]{2,}(?:${APOS}[${UP}]{2,})?(?:-[${UP}]{2,})*`;

export const PARTICLES = ['de', 'da', 'do', 'dos', 'das', 'e', 'di', 'del', 'von', 'van'];
export const SUFFIXES = ['Filho', 'Neto', 'Júnior', 'Junior', 'Jr.', 'Sobrinho'];

// A token that may sit inside a name (word, particle or suffix), with no
// trailing context. Case-sensitive: particles are all lower or all upper.
const PARTICLE_SRC = `(?:${PARTICLES.join('|')}|${PARTICLES.map((p) => p.toUpperCase()).join('|')})`;
const SUFFIX_SRC = `(?:${SUFFIXES.join('|')}|${SUFFIXES.map((s) => s.toUpperCase()).join('|')})`;
export const WORD_SRC = `(?:${CAP_WORD}|${UP_WORD})`;
// Must not be followed by another letter, or `JoÃO` would match as `Jo`.
export const END = `(?![${UP}${LOW}'’-])`;

export const MAX_NAME_WORDS = 7;
export const MIN_NAME_WORDS = 2;

const SEP = '[ \\t]+';
const wordRe = new RegExp(`^${WORD_SRC}$`);
const particleRe = new RegExp(`^${PARTICLE_SRC}$`);
const suffixRe = new RegExp(`^${SUFFIX_SRC}$`);

/** Is `token` a single name word (capitalized or all caps)? */
export const isNameWord = (token) => wordRe.test(token);
/** Is `token` one of the allowed lowercase/uppercase particles? */
export const isParticle = (token) => particleRe.test(token);
/** Is `token` a name suffix such as `Neto` or `Jr.`? */
export const isSuffix = (token) => suffixRe.test(token);

// word (SEP [particle SEP] word){1,6} [SEP suffix]; the sticky/anchored forms
// below are built from this body.
const NAME_BODY =
  `${WORD_SRC}${END}` +
  `(?:${SEP}(?:${PARTICLE_SRC}${SEP})?${WORD_SRC}${END}){1,${MAX_NAME_WORDS - 1}}` +
  `(?:${SEP}${SUFFIX_SRC}(?![${UP}${LOW}]))?`;

const nameAtRe = new RegExp(NAME_BODY, 'y');
const nameLineRe = new RegExp(`^${NAME_BODY}$`);

/**
 * Match a name starting exactly at `pos` in `line`.
 * @returns {string|null} The name text, or null.
 */
export function matchNameAt(line, pos) {
  nameAtRe.lastIndex = pos;
  const m = nameAtRe.exec(line);
  return m ? m[0] : null;
}

/** Is the whole (trimmed) `line` exactly one name? */
export function isNameLine(line) {
  return nameLineRe.test(line);
}

/** Split a name into tokens (words, particles, suffixes). */
export function nameTokens(name) {
  return name.split(/[ \t]+/);
}

/** Name words of a name: tokens that are neither particles nor suffixes. */
export function nameWords(name) {
  return nameTokens(name).filter((t) => !isParticle(t) && !isSuffix(t));
}

/**
 * Accent-stripped upper-case form, used to compare names and to match roles
 * and labels without regard to case or accents.
 *
 * Length-preserving by construction: a character whose decomposed, upper-cased
 * form is not exactly one character is kept as is. So an index in the
 * normalized text is valid in the original (given NFC input).
 */
export function normalize(text) {
  let out = '';
  for (const ch of text) {
    const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    out += n.length === ch.length ? n : ch;
  }
  return out;
}
