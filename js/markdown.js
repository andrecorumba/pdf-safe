// ═══════════════════════════════════════════════════
//  TEXT → MARKDOWN CONVERSION
//
//  Pure module: no DOM, no globals, no storage. Runs unchanged in Node.
// ═══════════════════════════════════════════════════

/**
 * Turn raw extracted PDF text into light Markdown.
 *
 * @param {string} text            Raw text, pages already separated by `---`.
 * @param {RegExp} headingPattern  Locale pattern for standalone ALL-CAPS lines
 *                                 (must be global and multiline).
 * @returns {string} Markdown.
 */
export function convertToMarkdown(text, headingPattern) {
  let md = text;

  // Normalize line breaks
  md = md.replace(/\r\n/g, '\n');

  // Page separators already added as ---
  // Detect potential headers (ALL CAPS lines, short, standalone)
  md = md.replace(headingPattern, (m) => {
    const trimmed = m.trim();
    if (trimmed.length < 60 && !trimmed.includes('.') && trimmed === trimmed.toUpperCase()) {
      return `## ${trimmed}`;
    }
    return m;
  });

  // Clean up excessive whitespace
  md = md.replace(/\n{4,}/g, '\n\n\n');
  md = md.replace(/[ \t]+$/gm, '');

  return md;
}
