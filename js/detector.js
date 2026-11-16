// ═══════════════════════════════════════════════════
//  SENSITIVE DATA DETECTION
//
//  Pure module: no DOM, no globals, no storage. Runs unchanged in Node.
// ═══════════════════════════════════════════════════

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 };

/**
 * Scan `text` with a rule set and optional function detectors, and return the
 * findings that survive overlap resolution.
 *
 * @param {string} text        Text to scan.
 * @param {Array}  regexDb     Rules, each `{ id, cat, label, regex, replacement | replacement_fn, validate?, confidence? }`.
 *                             A rule without `confidence` produces `'high'` findings.
 * @param {Array<function(string): Array>} [detectors]
 *                             Functions `(text) => findings` for detection that needs more than
 *                             one regex (neighbouring lines, earlier findings). Each finding is
 *                             `{ id, cat, label, value, index, length, replacement, confidence? }`.
 * @returns {Array} Findings `{ id, cat, label, value, index, length, replacement, confidence }`,
 *                  sorted by position, non-overlapping.
 */
export function detectSensitiveData(text, regexDb, detectors = []) {
  const found = [];
  const seen = new Set();

  for (const rule of regexDb) {
    // Fresh RegExp per run so the shared rule object keeps no lastIndex state.
    const re = new RegExp(rule.regex.source, rule.regex.flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      const value = match[0];
      const key = `${rule.id}::${match.index}::${value}`;

      if (rule.validate && !rule.validate(value)) continue;

      // Avoid exact duplicate at same position
      if (seen.has(key)) continue;
      seen.add(key);

      const replacement = rule.replacement_fn
        ? rule.replacement_fn(value)
        : rule.replacement;

      found.push({
        id: rule.id,
        cat: rule.cat,
        label: rule.label,
        value: value,
        index: match.index,
        length: value.length,
        replacement: replacement,
        confidence: rule.confidence || 'high'
      });
    }
  }

  for (const detect of detectors) {
    for (const f of detect(text)) {
      found.push({ ...f, confidence: f.confidence || 'high' });
    }
  }

  return resolveOverlaps(found);
}

// Higher confidence wins; within the same confidence the finding that starts
// first wins (ties keep rule order, since Array.prototype.sort is stable).
// With every finding at the same confidence this reduces to the original
// "first one reaching a position wins" sweep.
function resolveOverlaps(found) {
  const byPriority = [...found].sort((a, b) =>
    (CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence]) || (a.index - b.index));

  // Accepted findings, kept sorted by index and mutually non-overlapping.
  const accepted = [];
  for (const f of byPriority) {
    const end = f.index + f.length;
    // First accepted finding starting at or after f.index.
    let lo = 0, hi = accepted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (accepted[mid].index < f.index) lo = mid + 1; else hi = mid;
    }
    const prev = accepted[lo - 1];
    const next = accepted[lo];
    if (prev && prev.index + prev.length > f.index) continue;
    if (next && next.index < end) continue;
    accepted.splice(lo, 0, f);
  }
  return accepted;
}
