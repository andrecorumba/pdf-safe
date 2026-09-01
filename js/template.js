// ═══════════════════════════════════════════════════
//  APP MARKUP
//
//  The DOM is built here once and shared by both locales; the shells only
//  choose which rules and strings to feed it. No user-facing text is written
//  in this file — every string comes from the i18n module.
// ═══════════════════════════════════════════════════

const FLAG_BR = `<svg class="flag-icon" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg"><rect width="22" height="16" fill="#009B3A"/><polygon points="11,2 20,8 11,14 2,8" fill="#FEDF00"/><circle cx="11" cy="8" r="3.6" fill="#002776"/><path d="M7.7 7.2 A3.6 3.6 0 0 1 14.3 7.2" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/></svg>`;

const FLAG_US = `<svg class="flag-icon" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg"><rect width="22" height="16" fill="#B22234"/><rect y="1.23" width="22" height="1.23" fill="#fff"/><rect y="3.69" width="22" height="1.23" fill="#fff"/><rect y="6.15" width="22" height="1.23" fill="#fff"/><rect y="8.61" width="22" height="1.23" fill="#fff"/><rect y="11.08" width="22" height="1.23" fill="#fff"/><rect y="13.54" width="22" height="1.23" fill="#fff"/><rect width="8.8" height="8.62" fill="#3C3B6E"/><g fill="#fff"><circle cx="1.0" cy="0.86" r="0.3"/><circle cx="2.2" cy="0.86" r="0.3"/><circle cx="3.4" cy="0.86" r="0.3"/><circle cx="4.6" cy="0.86" r="0.3"/><circle cx="5.8" cy="0.86" r="0.3"/><circle cx="7.0" cy="0.86" r="0.3"/><circle cx="1.6" cy="1.72" r="0.3"/><circle cx="2.8" cy="1.72" r="0.3"/><circle cx="4.0" cy="1.72" r="0.3"/><circle cx="5.2" cy="1.72" r="0.3"/><circle cx="6.4" cy="1.72" r="0.3"/><circle cx="1.0" cy="2.58" r="0.3"/><circle cx="2.2" cy="2.58" r="0.3"/><circle cx="3.4" cy="2.58" r="0.3"/><circle cx="4.6" cy="2.58" r="0.3"/><circle cx="5.8" cy="2.58" r="0.3"/><circle cx="7.0" cy="2.58" r="0.3"/><circle cx="1.6" cy="3.44" r="0.3"/><circle cx="2.8" cy="3.44" r="0.3"/><circle cx="4.0" cy="3.44" r="0.3"/><circle cx="5.2" cy="3.44" r="0.3"/><circle cx="6.4" cy="3.44" r="0.3"/><circle cx="1.0" cy="4.30" r="0.3"/><circle cx="2.2" cy="4.30" r="0.3"/><circle cx="3.4" cy="4.30" r="0.3"/><circle cx="4.6" cy="4.30" r="0.3"/><circle cx="5.8" cy="4.30" r="0.3"/><circle cx="7.0" cy="4.30" r="0.3"/><circle cx="1.6" cy="5.16" r="0.3"/><circle cx="2.8" cy="5.16" r="0.3"/><circle cx="4.0" cy="5.16" r="0.3"/><circle cx="5.2" cy="5.16" r="0.3"/><circle cx="6.4" cy="5.16" r="0.3"/><circle cx="1.0" cy="6.02" r="0.3"/><circle cx="2.2" cy="6.02" r="0.3"/><circle cx="3.4" cy="6.02" r="0.3"/><circle cx="4.6" cy="6.02" r="0.3"/><circle cx="5.8" cy="6.02" r="0.3"/><circle cx="7.0" cy="6.02" r="0.3"/><circle cx="1.6" cy="6.88" r="0.3"/><circle cx="2.8" cy="6.88" r="0.3"/><circle cx="4.0" cy="6.88" r="0.3"/><circle cx="5.2" cy="6.88" r="0.3"/><circle cx="6.4" cy="6.88" r="0.3"/><circle cx="1.0" cy="7.74" r="0.3"/><circle cx="2.2" cy="7.74" r="0.3"/><circle cx="3.4" cy="7.74" r="0.3"/><circle cx="4.6" cy="7.74" r="0.3"/><circle cx="5.8" cy="7.74" r="0.3"/><circle cx="7.0" cy="7.74" r="0.3"/></g></svg>`;

const FLAG_CHECK = `<svg class="flag-check" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CHEVRON = `<svg class="flag-chevron" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const GITHUB_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>`;

const LOCALES = [
  { id: 'pt-BR', href: 'pdf-safe-brazil.html', flag: FLAG_BR, label: 'Português (BR)' },
  { id: 'en-US', href: 'pdf-safe-usa.html', flag: FLAG_US, label: 'English (US)' },
];

const GITHUB_URL = 'https://github.com/andrecorumba/pdf-safe';

/**
 * Build the whole app markup for one locale.
 *
 * @param {object} t                 i18n strings.
 * @param {object} categories        CATEGORIES from the locale's rule module.
 * @param {string[]} manualCategories Category ids offered in the manual dropdown.
 * @param {string} locale            'pt-BR' | 'en-US' — marks the active language.
 * @returns {string} HTML.
 */
export function appMarkup(t, categories, manualCategories, locale) {
  const current = LOCALES.find(l => l.id === locale) || LOCALES[0];

  const languageOptions = LOCALES.map(l => `
          <a href="${l.href}" class="flag-option${l.id === locale ? ' active' : ''}">
            ${l.flag}
            <span class="flag-option-label">${l.label}</span>
            ${l.id === locale ? FLAG_CHECK : ''}
          </a>`).join('');

  const manualOptions = manualCategories.map(id => {
    const c = categories[id];
    const label = c.option || c.singular;
    return `<option value="${id}"${id === 'manual' ? ' selected' : ''}>${c.icon} ${label}</option>`;
  }).join('\n    ');

  return `
<!-- Header -->
<header class="header">
  <div class="header-inner">
    <div class="logo">
      <div class="logo-icon">🔐</div>
      <div>
        <div class="logo-text">PDF Safe</div>
      </div>
      <span class="logo-tag">${t.logoTag}</span>
    </div>
    <div class="header-actions">
      <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" class="github-link" title="${t.githubTitle}">
        ${GITHUB_ICON}
      </a>
      <div class="flag-select" id="flagSelect">
        <button class="flag-select-btn" id="flagSelectBtn" aria-haspopup="true" aria-expanded="false" title="${t.languageTitle}">
          ${current.flag}
          ${CHEVRON}
        </button>
        <div class="flag-select-dropdown">${languageOptions}
        </div>
      </div>
      <div class="header-stats" id="headerStats" style="display:none;">
        <div class="stat-pill stat-danger"><span class="dot"></span> <span id="statFindings">0</span> ${t.statItems}</div>
        <div class="stat-pill stat-warn"><span class="dot"></span> <span id="statCategories">0</span> ${t.statCategories}</div>
        <div class="stat-pill stat-success"><span class="dot"></span> <span id="statPages">0</span> ${t.statPages}</div>
      </div>
    </div>
  </div>
</header>

<div class="app">

  <!-- Upload -->
  <div class="upload-zone" id="uploadZone">
    <span class="upload-icon">📄</span>
    <div class="upload-title">${t.uploadTitle}</div>
    <div class="upload-sub">${t.uploadSub}</div>
  </div>
  <input type="file" id="fileInput" accept=".pdf">

  <!-- Processing -->
  <div class="processing" id="processing">
    <div class="spinner"></div>
    <div class="processing-text" id="processingText">${t.extractingText}</div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
  </div>

  <!-- Workspace -->
  <div class="workspace" id="workspace">

    <!-- Summary -->
    <div class="summary-bar" id="summaryBar"></div>

    <!-- Filter chips -->
    <div class="filter-bar" id="filterBar"></div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="tab-group" id="tabGroup">
        <button class="tab-btn active" data-view="highlighted">${t.tabHighlighted}</button>
        <button class="tab-btn" data-view="markdown">${t.tabMarkdown}</button>
        <button class="tab-btn" data-view="preview">${t.tabPreview}</button>
      </div>
      <div class="toolbar-spacer"></div>
      <button class="btn btn-danger" id="btnAnonymize">${t.actionAnonymize}</button>
      <button class="btn btn-success" id="btnDownload">${t.actionDownload}</button>
      <button class="btn" id="btnCopy">${t.actionCopy}</button>
      <button class="btn" id="btnReset">${t.actionReset}</button>
    </div>

    <!-- Panels -->
    <div class="panels">
      <div class="panel">
        <div class="panel-header">
          <span>📄</span>
          <h3 id="leftPanelTitle">${t.panelHighlighted}</h3>
          <span class="panel-badge" id="leftBadge" style="background:var(--danger-bg);color:var(--danger);"></span>
        </div>
        <div class="panel-body">
          <div class="content-display" id="contentDisplay"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <span>🔎</span>
          <h3>${t.panelFindings}</h3>
          <span class="panel-badge" id="findingsCount" style="background:var(--warn-bg);color:var(--warn);"></span>
        </div>
        <div class="panel-body">
          <div class="findings-list" id="findingsList"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<!-- Manual finding tooltip -->
<div id="addFindingTooltip">
  <div class="tooltip-header">${t.tooltipHeader}</div>
  <div class="tooltip-selected" id="tooltipSelectedText"></div>
  <select id="tooltipCategory">
    ${manualOptions}
  </select>
  <input type="text" id="tooltipReplacement" placeholder="${t.tooltipReplacementPlaceholder}">
  <div class="tooltip-actions">
    <button class="btn btn-primary" id="tooltipConfirm" style="flex:1;padding:8px 12px;">${t.tooltipAdd}</button>
    <button class="btn" id="tooltipCancel" style="padding:8px 14px;">${t.tooltipCancel}</button>
  </div>
</div>
`;
}
