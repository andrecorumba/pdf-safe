// ═══════════════════════════════════════════════════
//  UI STRINGS — English (US)
//
//  Category and rule labels are not here: they name locale-specific concepts
//  (SSN, EIN) and live with the rules that define them, in js/rules/us.js.
// ═══════════════════════════════════════════════════
export const i18n = {
  lang: 'en',
  title: 'PDF Safe — US PII De-identification',

  // Header
  logoTag: 'HIPAA / CCPA',
  githubTitle: 'View on GitHub',
  languageTitle: 'Language',
  statItems: 'items',
  statCategories: 'categories',
  statPages: 'pages',

  // Upload
  uploadTitle: 'Drop a PDF here or click to select',
  uploadSub: '100% local processing — no data leaves your browser',
  changeFile: 'Change',
  invalidPdf: 'Please select a valid PDF file',

  // Processing
  extractingText: 'Extracting text from PDF...',
  extractingPage: (page, total) => `Extracting page ${page} of ${total}...`,
  convertingMarkdown: 'Converting to Markdown...',
  detectingData: 'Detecting sensitive data...',
  processingDone: (n) => `Done! ${n} items found.`,
  processingError: (msg) => 'Error processing PDF: ' + msg,

  // Toolbar
  tabHighlighted: '🔍 Highlighted',
  tabMarkdown: '📝 Markdown',
  tabPreview: '👁️ Preview',
  actionAnonymize: '🔒 Redact All',
  actionDownload: '⬇ Download .md',
  actionCopy: '📋 Copy',
  actionReset: '↺ New',

  // Summary and filters
  summaryTotal: 'Total found',
  summaryCategories: 'Categories',
  filterAll: 'All',
  filterDismissed: (n) => `🚫 ${n} dismissed`,

  // Left panel
  panelHighlighted: 'Highlighted Text',
  panelAnonymized: 'Redacted Text',
  panelRawMarkdown: 'Raw Markdown',
  panelPreview: 'Rendered Preview',
  badgeClean: '🔒 Clean',
  badgeItems: (n) => `${n} items`,

  // Findings panel
  panelFindings: 'Findings',
  noItemsForFilters: 'No items visible with current filters',
  noSensitiveData: 'No sensitive data found',
  dismissTitle: 'Dismiss (false positive)',
  restoreTitle: 'Restore item',
  dismissedHeader: (n) => `🚫 Dismissed (${n})`,
  dismissedToggle: (shown) => `click to ${shown ? 'hide' : 'show'}`,
  suggestionTag: 'low-confidence suggestion',
  suggestionTitle: 'Low-confidence detection: it will not be redacted unless you restore it',
  toastDismissed: '🚫 Item dismissed — will not be redacted',
  toastRestored: '✅ Item restored',

  // Anonymization
  toastAnonymizeUndone: 'Redaction removed — original text restored',
  toastAnonymized: (n) => `✅ ${n} sensitive items successfully redacted!`,
  downloadFileName: 'redacted_document.md',
  downloadFileNameOriginal: 'document.md',
  toastDownloaded: '📥 Markdown downloaded!',
  toastCopied: '📋 Copied to clipboard!',

  // Manual selection
  tooltipHeader: '✏️ Add as sensitive data',
  tooltipReplacementPlaceholder: 'Replace with (default: [REDACTED])',
  tooltipAdd: '➕ Add',
  tooltipCancel: 'Cancel',
  defaultReplacement: '[REDACTED]',
  toastManualAdded: (n) => `✏️ ${n} occurrence${n > 1 ? 's' : ''} added manually`,
  toastManualNotFound: 'Text not found in document or already mapped',
};
