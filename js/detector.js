// ═══════════════════════════════════════════════════
//  SENSITIVE DATA DETECTION
//
//  Pure module: no DOM, no globals, no storage. Runs unchanged in Node.
// ═══════════════════════════════════════════════════

/**
 * Scan `text` with a rule set and return the findings that survive overlap
 * resolution.
 *
 * @param {string} text        Text to scan.
 * @param {Array}  regexDb     Rules, each `{ id, cat, label, regex, replacement | replacement_fn, validate? }`.
 * @returns {Array} Findings `{ id, cat, label, value, index, length, replacement }`,
 *                  sorted by position, non-overlapping.
 */
export function detectSensitiveData(text, regexDb) {
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
        replacement: replacement
      });
    }
  }

  found.sort((a, b) => a.index - b.index);

  // Drop overlapping matches: the first one reaching a position wins.
  const cleaned = [];
  let lastEnd = -1;
  for (const f of found) {
    if (f.index >= lastEnd) {
      cleaned.push(f);
      lastEnd = f.index + f.length;
    }
  }

  return cleaned;
}
