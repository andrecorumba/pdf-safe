// ═══════════════════════════════════════════════════
//  PDF SAFE — application flow
//
//  Shared by both locales. Everything locale-specific arrives through boot():
//  detection rules (js/rules/*.js) and UI strings (js/i18n/*.js).
// ═══════════════════════════════════════════════════
import { detectSensitiveData } from './detector.js';
import { convertToMarkdown } from './markdown.js';
import { appMarkup } from './template.js';

const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export function boot({ rules, i18n: t, locale }) {
  const { REGEX_DB, CATEGORIES, MANUAL_CATEGORIES, headingPattern } = rules;
  const DETECTORS = rules.DETECTORS ?? [];

  // ═══════════════════════════════════════════════════
  //  MOUNT
  // ═══════════════════════════════════════════════════
  document.documentElement.lang = t.lang;
  document.title = t.title;
  document.getElementById('app').innerHTML =
    appMarkup(t, CATEGORIES, MANUAL_CATEGORIES, locale);

  const $ = (id) => document.getElementById(id);

  // ═══════════════════════════════════════════════════
  //  APP STATE
  // ═══════════════════════════════════════════════════
  let markdownText = '';
  let findings = [];
  let anonymizedMarkdown = '';
  let isAnonymized = false;
  let activeFilters = new Set(Object.keys(CATEGORIES));
  let dismissed = new Set();    // indices of dismissed findings: the user's, plus low-confidence suggestions
  let userDismissed = new Set(); // subset of `dismissed` the user dismissed by hand (not untouched suggestions)
  let showDismissed = false;    // toggle collapsed section
  let currentView = 'highlighted';

  const toneOf = (cat) => `tone-${CATEGORIES[cat]?.tone || 'slate'}`;

  // ═══════════════════════════════════════════════════
  //  PDF.js SETUP
  // ═══════════════════════════════════════════════════
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;

  // ═══════════════════════════════════════════════════
  //  FILE UPLOAD
  // ═══════════════════════════════════════════════════
  const uploadZone = $('uploadZone');
  const fileInput = $('fileInput');

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });

  function handleFile(file) {
    if (file.type !== 'application/pdf') {
      showToast(t.invalidPdf, 'danger');
      return;
    }
    // Update upload zone
    uploadZone.classList.add('has-file');
    uploadZone.innerHTML = `<div class="upload-file-info">
      <div class="file-icon">📄</div>
      <div class="file-details">
        <div class="file-name">${escapeHTML(file.name)}</div>
        <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button class="change-btn" id="changeFileBtn">${t.changeFile}</button>
    </div>`;
    $('changeFileBtn').addEventListener('click', (e) => { e.stopPropagation(); resetApp(); });

    processPDF(file);
  }

  // ═══════════════════════════════════════════════════
  //  PDF PROCESSING
  // ═══════════════════════════════════════════════════
  async function processPDF(file) {
    const proc = $('processing');
    const progFill = $('progressFill');
    const procText = $('processingText');
    proc.classList.add('active');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= totalPages; i++) {
        procText.textContent = t.extractingPage(i, totalPages);
        progFill.style.width = `${(i / totalPages * 70)}%`;

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let pageText = '';
        let lastY = null;

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str;
          if (item.hasEOL) pageText += '\n';
          lastY = item.transform[5];
        }
        fullText += pageText + '\n\n---\n\n';
      }

      const rawText = fullText.trim();
      procText.textContent = t.convertingMarkdown;
      progFill.style.width = '80%';

      markdownText = convertToMarkdown(rawText, headingPattern);

      procText.textContent = t.detectingData;
      progFill.style.width = '90%';

      findings = detectSensitiveData(markdownText, REGEX_DB, DETECTORS);

      // Low-confidence findings start dismissed: the user restores the ones they want.
      dismissed = new Set();
      userDismissed = new Set();
      findings.forEach((f, i) => { if (f.confidence === 'low') dismissed.add(i); });
      const activeFindings = findings.filter((_, i) => !dismissed.has(i));

      progFill.style.width = '100%';
      procText.textContent = t.processingDone(activeFindings.length);

      $('statFindings').textContent = activeFindings.length;
      $('statCategories').textContent = new Set(activeFindings.map(f => f.cat)).size;
      $('statPages').textContent = totalPages;
      $('headerStats').style.display = 'flex';

      setTimeout(() => {
        proc.classList.remove('active');
        $('workspace').classList.add('active');
        renderSummary();
        renderFilters();
        renderContent();
        renderFindings();
      }, 400);

    } catch (err) {
      console.error(err);
      proc.classList.remove('active');
      showToast(t.processingError(err.message), 'danger');
    }
  }

  // ═══════════════════════════════════════════════════
  //  RENDERING
  // ═══════════════════════════════════════════════════
  function renderSummary() {
    const bar = $('summaryBar');
    const activeFindings = findings.filter((_, i) => !dismissed.has(i));
    const catCounts = {};
    activeFindings.forEach(f => { catCounts[f.cat] = (catCounts[f.cat] || 0) + 1; });

    bar.innerHTML = `
      <div class="summary-card">
        <div class="sc-label">${t.summaryTotal}</div>
        <div class="sc-value sc-danger">${activeFindings.length}</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">${t.summaryCategories}</div>
        <div class="sc-value sc-warn">${Object.keys(catCounts).length}</div>
      </div>
      ${Object.entries(catCounts).slice(0, 4).map(([cat, count]) => `
        <div class="summary-card">
          <div class="sc-label">${CATEGORIES[cat]?.icon || '📋'} ${CATEGORIES[cat]?.label || cat}</div>
          <div class="sc-value ${CATEGORIES[cat]?.summary || 'sc-info'}">${count}</div>
        </div>
      `).join('')}
    `;
  }

  function renderFilters() {
    const bar = $('filterBar');
    const catCounts = {};
    findings.forEach((f, i) => { if (!dismissed.has(i)) catCounts[f.cat] = (catCounts[f.cat] || 0) + 1; });
    const totalActive = findings.filter((_, i) => !dismissed.has(i)).length;

    bar.innerHTML = `
      <div class="filter-chip active" data-action="filter-all">
        ${t.filterAll} <span class="count">${totalActive}</span>
      </div>
      ${Object.entries(catCounts).map(([cat, count]) => `
        <div class="filter-chip ${activeFilters.has(cat) ? 'active' : ''}" data-cat="${cat}">
          ${CATEGORIES[cat]?.icon || '📋'} ${CATEGORIES[cat]?.label || cat}
          <span class="count">${count}</span>
        </div>
      `).join('')}
      ${dismissed.size ? `<div class="filter-chip" style="border-color:var(--danger-border);color:var(--danger);cursor:default;">
        ${t.filterDismissed(dismissed.size)}
      </div>` : ''}
    `;
  }

  // Filter chips are re-rendered constantly, so listen on the container.
  $('filterBar').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    if (chip.dataset.action === 'filter-all') toggleFilterAll(chip);
    else if (chip.dataset.cat) toggleFilter(chip.dataset.cat, chip);
  });

  function toggleFilter(cat, el) {
    el.classList.toggle('active');
    if (activeFilters.has(cat)) {
      activeFilters.delete(cat);
    } else {
      activeFilters.add(cat);
    }
    renderContent();
    renderFindings();
  }

  function toggleFilterAll(el) {
    const allChips = document.querySelectorAll('.filter-chip[data-cat]');
    const allActive = activeFilters.size === Object.keys(CATEGORIES).length;
    if (allActive) {
      activeFilters.clear();
      allChips.forEach(c => c.classList.remove('active'));
      el.classList.remove('active');
    } else {
      allChips.forEach(c => { c.classList.add('active'); activeFilters.add(c.dataset.cat); });
      el.classList.add('active');
    }
    renderContent();
    renderFindings();
  }

  function renderContent() {
    const display = $('contentDisplay');
    const title = $('leftPanelTitle');
    const badge = $('leftBadge');
    const textToUse = isAnonymized ? anonymizedMarkdown : markdownText;

    if (currentView === 'highlighted') {
      title.textContent = isAnonymized ? t.panelAnonymized : t.panelHighlighted;
      const visibleFindings = (isAnonymized ? [] : findings).filter((f, i) => activeFilters.has(f.cat) && !dismissed.has(i));
      badge.textContent = isAnonymized ? t.badgeClean : t.badgeItems(visibleFindings.length);
      badge.style.background = isAnonymized ? 'var(--success-bg)' : 'var(--danger-bg)';
      badge.style.color = isAnonymized ? 'var(--success)' : 'var(--danger)';

      if (isAnonymized) {
        display.innerHTML = escapeHTML(anonymizedMarkdown);
      } else {
        display.innerHTML = highlightText(markdownText, visibleFindings);
      }
    } else if (currentView === 'markdown') {
      title.textContent = t.panelRawMarkdown;
      badge.textContent = 'MD';
      badge.style.background = 'var(--info-bg)';
      badge.style.color = 'var(--info)';
      display.innerHTML = escapeHTML(textToUse);
    } else if (currentView === 'preview') {
      title.textContent = t.panelPreview;
      badge.textContent = 'HTML';
      badge.style.background = 'var(--purple-bg)';
      badge.style.color = 'var(--purple)';
      display.innerHTML = `<div class="md-preview">${marked.parse(textToUse)}</div>`;
      display.style.fontFamily = "'DM Sans', sans-serif";
      return;
    }
    display.style.fontFamily = "'JetBrains Mono', monospace";
  }

  function highlightText(text, matchList) {
    if (!matchList.length) return escapeHTML(text);

    let result = '';
    let lastIdx = 0;

    const sorted = [...matchList].sort((a, b) => a.index - b.index);

    for (const f of sorted) {
      // Text before match
      result += escapeHTML(text.substring(lastIdx, f.index));
      // Highlighted match
      const matchText = text.substring(f.index, f.index + f.length);
      result += `<span class="hl ${toneOf(f.cat)}" title="${f.label}: ${escapeAttr(matchText)}">${escapeHTML(matchText)}</span>`;
      lastIdx = f.index + f.length;
    }
    // Remaining text
    result += escapeHTML(text.substring(lastIdx));
    return result;
  }

  function renderFindings() {
    rerenderPending = false;   // a full redraw supersedes any deferred one
    const list = $('findingsList');
    const badge = $('findingsCount');
    const active = findings.filter((f, i) => activeFilters.has(f.cat) && !dismissed.has(i));
    const dismissedVisible = findings.filter((f, i) => activeFilters.has(f.cat) && dismissed.has(i));
    badge.textContent = t.badgeItems(active.length);

    if (!active.length && !dismissedVisible.length) {
      list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);">
        ${findings.length ? t.noItemsForFilters : t.noSensitiveData}
      </div>`;
      return;
    }

    // --- Active findings grouped by category ---
    const grouped = {};
    active.forEach((f) => {
      const idx = findings.indexOf(f);
      if (!grouped[f.cat]) grouped[f.cat] = [];
      grouped[f.cat].push({ ...f, _idx: idx });
    });

    let html = '';
    for (const [cat, items] of Object.entries(grouped)) {
      const meta = CATEGORIES[cat] || { label: cat, icon: '📋' };
      html += `<div style="font-size:0.7rem;color:var(--text-dim);margin:12px 0 6px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">
        ${meta.icon} ${meta.label} (${items.length})
      </div>`;
      for (const f of items) {
        html += `<div class="finding-item">
          <span class="finding-type ${toneOf(f.cat)}">${escapeHTML(f.label)}</span>
          <span class="finding-value" title="${escapeAttr(f.value)}">${escapeHTML(f.value)}</span>
          <span class="finding-replacement">→ ${escapeHTML(f.replacement)}</span>
          <button class="finding-dismiss" data-dismiss="${f._idx}" title="${t.dismissTitle}">−</button>
        </div>`;
      }
    }

    // --- Dismissed items (collapsible) ---
    if (dismissedVisible.length) {
      html += `<div class="dismissed-header" data-action="toggle-dismissed">
        <span class="chevron ${showDismissed ? 'open' : ''}">▶</span>
        ${t.dismissedHeader(dismissedVisible.length)}
        <span style="margin-left:auto;font-size:0.6rem;opacity:0.6;">${t.dismissedToggle(showDismissed)}</span>
      </div>`;
      html += `<div class="dismissed-section" style="display:${showDismissed ? 'block' : 'none'};">`;
      for (const f of dismissedVisible) {
        const idx = findings.indexOf(f);
        const isSuggestion = f.confidence === 'low' && !userDismissed.has(idx);
        html += `<div class="finding-item dismissed${isSuggestion ? ' suggested' : ''}">
          <span class="finding-type ${toneOf(f.cat)}">${escapeHTML(f.label)}</span>
          <span class="finding-value" title="${escapeAttr(f.value)}">${escapeHTML(f.value)}</span>
          ${isSuggestion ? `<span class="finding-suggestion" title="${escapeAttr(t.suggestionTitle)}">${escapeHTML(t.suggestionTag)}</span>` : ''}
          <button class="finding-restore" data-restore="${idx}" title="${t.restoreTitle}">+</button>
        </div>`;
      }
      html += `</div>`;
    }

    list.innerHTML = html;
  }

  // Dismissing a finding moves its row to the collapsed section at the bottom,
  // which slides every row below it up — including one landing right under the
  // pointer, so the next click would hit a finding the user never aimed at.
  // While the pointer is inside the list we restyle the clicked row in place and
  // hold the reorganisation back until the pointer leaves.
  let pointerInList = false;
  let rerenderPending = false;

  const findingsListEl = $('findingsList');
  findingsListEl.addEventListener('mouseenter', () => { pointerInList = true; });
  findingsListEl.addEventListener('mouseleave', () => {
    pointerInList = false;
    if (rerenderPending) redrawLists();
  });

  function redrawLists() {
    rerenderPending = false;
    renderSummary();
    renderFilters();
    renderFindings();
  }

  // Same as redrawLists, but yields to a pointer that is still working the list.
  function redrawListsWhenSafe() {
    if (pointerInList) { rerenderPending = true; return; }
    redrawLists();
  }

  // Flip one row between active and dismissed without disturbing the layout.
  function setRowDismissed(row, idx, isDismissed) {
    if (!row) return;
    row.classList.toggle('dismissed', isDismissed);
    const btn = row.querySelector('button');
    if (!btn) return;
    if (isDismissed) {
      delete btn.dataset.dismiss;
      btn.dataset.restore = idx;
      btn.className = 'finding-restore';
      btn.title = t.restoreTitle;
      btn.textContent = '+';
    } else {
      delete btn.dataset.restore;
      btn.dataset.dismiss = idx;
      btn.className = 'finding-dismiss';
      btn.title = t.dismissTitle;
      btn.textContent = '−';
    }
  }

  // Findings are re-rendered on every change, so listen on the container.
  findingsListEl.addEventListener('click', (e) => {
    const dismissBtn = e.target.closest('[data-dismiss]');
    if (dismissBtn) return dismissFinding(+dismissBtn.dataset.dismiss, dismissBtn.closest('.finding-item'));
    const restoreBtn = e.target.closest('[data-restore]');
    if (restoreBtn) return restoreFinding(+restoreBtn.dataset.restore, restoreBtn.closest('.finding-item'));
    if (e.target.closest('[data-action="toggle-dismissed"]')) toggleDismissedSection();
  });

  function dismissFinding(idx, row) {
    dismissed.add(idx);
    userDismissed.add(idx);
    setRowDismissed(row, idx, true);
    updateHeaderStats();
    renderContent();
    redrawListsWhenSafe();
    showToast(t.toastDismissed, 'danger');
  }

  function restoreFinding(idx, row) {
    dismissed.delete(idx);
    userDismissed.delete(idx);
    setRowDismissed(row, idx, false);
    updateHeaderStats();
    renderContent();
    redrawListsWhenSafe();
    showToast(t.toastRestored, 'success');
  }

  function toggleDismissedSection() {
    showDismissed = !showDismissed;
    renderFindings();
  }

  function updateHeaderStats() {
    const activeCount = findings.filter((f, i) => !dismissed.has(i)).length;
    const catCount = new Set(findings.filter((f, i) => !dismissed.has(i)).map(f => f.cat)).size;
    $('statFindings').textContent = activeCount;
    $('statCategories').textContent = catCount;
  }

  // ═══════════════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════════════
  function anonymizeAll() {
    if (isAnonymized) {
      // Undo anonymization
      isAnonymized = false;
      anonymizedMarkdown = '';
      renderContent();
      renderFindings();
      showToast(t.toastAnonymizeUndone, 'danger');
      return;
    }

    let text = markdownText;

    // Apply replacements from end to start (reverse order) to preserve indices
    const sorted = [...findings].filter((f, i) => activeFilters.has(f.cat) && !dismissed.has(i)).sort((a, b) => b.index - a.index);

    for (const f of sorted) {
      const before = text.substring(0, f.index);
      const after = text.substring(f.index + f.length);
      text = before + f.replacement + after;
    }

    anonymizedMarkdown = text;
    isAnonymized = true;
    renderContent();
    renderFindings();
    showToast(t.toastAnonymized(sorted.length), 'success');
  }

  function downloadMarkdown() {
    const text = isAnonymized ? anonymizedMarkdown : markdownText;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isAnonymized ? t.downloadFileName : t.downloadFileNameOriginal;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t.toastDownloaded, 'success');
  }

  function copyToClipboard() {
    const text = isAnonymized ? anonymizedMarkdown : markdownText;
    navigator.clipboard.writeText(text).then(() => {
      showToast(t.toastCopied, 'success');
    });
  }

  function switchView(view, btn) {
    currentView = view;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderContent();
  }

  function resetApp() {
    markdownText = '';
    findings = [];
    anonymizedMarkdown = '';
    isAnonymized = false;
    activeFilters = new Set(Object.keys(CATEGORIES));
    dismissed = new Set();
    userDismissed = new Set();
    showDismissed = false;
    currentView = 'highlighted';

    $('workspace').classList.remove('active');
    $('headerStats').style.display = 'none';
    $('processing').classList.remove('active');

    const uz = $('uploadZone');
    uz.classList.remove('has-file');
    uz.innerHTML = `<span class="upload-icon">📄</span>
      <div class="upload-title">${t.uploadTitle}</div>
      <div class="upload-sub">${t.uploadSub}</div>`;
    fileInput.value = '';

    // The tab group is static markup, so reset it to the default view.
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === 'highlighted'));
  }

  $('tabGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchView(btn.dataset.view, btn);
  });
  $('btnAnonymize').addEventListener('click', anonymizeAll);
  $('btnDownload').addEventListener('click', downloadMarkdown);
  $('btnCopy').addEventListener('click', copyToClipboard);
  $('btnReset').addEventListener('click', resetApp);

  // ═══════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const flagSelect = $('flagSelect');
  $('flagSelectBtn').addEventListener('click', () => {
    const isOpen = flagSelect.classList.toggle('open');
    $('flagSelectBtn').setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', (e) => {
    if (!flagSelect.contains(e.target)) {
      flagSelect.classList.remove('open');
      $('flagSelectBtn').setAttribute('aria-expanded', 'false');
    }
  });

  function showToast(msg, type = 'success') {
    const el = $('toast');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ═══════════════════════════════════════════════════
  //  MANUAL SELECTION — add unlisted sensitive data
  // ═══════════════════════════════════════════════════
  let pendingSelectionText = null;

  $('contentDisplay').addEventListener('mouseup', () => {
    setTimeout(() => {
      if (isAnonymized || currentView !== 'highlighted') return;
      const sel = window.getSelection();
      const selectedText = sel.toString().trim();
      if (!selectedText || selectedText.length < 2) return;
      const display = $('contentDisplay');
      if (!display.contains(sel.anchorNode)) return;
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showAddFindingTooltip(rect, selectedText);
      } catch (e) {}
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#addFindingTooltip')) hideAddFindingTooltip();
  });

  function showAddFindingTooltip(rect, text) {
    const tooltip = $('addFindingTooltip');
    $('tooltipSelectedText').textContent =
      text.length > 60 ? text.substring(0, 60) + '…' : text;
    $('tooltipReplacement').value = t.defaultReplacement;
    $('tooltipCategory').value = 'manual';

    let top = rect.bottom + 8;
    let left = rect.left;
    const tw = 310;
    if (top + 200 > window.innerHeight) top = rect.top - 8 - 200;
    if (left + tw > window.innerWidth - 16) left = window.innerWidth - tw - 16;
    if (left < 8) left = 8;

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    tooltip.style.display = 'block';
    pendingSelectionText = text;
  }

  function hideAddFindingTooltip() {
    $('addFindingTooltip').style.display = 'none';
    pendingSelectionText = null;
  }

  function confirmManualFinding() {
    if (!pendingSelectionText) return;
    const cat = $('tooltipCategory').value;
    const replacement = $('tooltipReplacement').value.trim() || t.defaultReplacement;
    const text = pendingSelectionText;
    let added = 0, searchStart = 0;
    while (true) {
      const idx = markdownText.indexOf(text, searchStart);
      if (idx === -1) break;
      const overlaps = findings.some(f => idx < f.index + f.length && f.index < idx + text.length);
      if (!overlaps) {
        findings.push({
          id: 'manual_' + Date.now() + '_' + added,
          cat, label: CATEGORIES[cat]?.singular || cat,
          value: text, index: idx, length: text.length,
          replacement, manual: true
        });
        added++;
        activeFilters.add(cat);
      }
      searchStart = idx + text.length;
    }
    hideAddFindingTooltip();
    if (added > 0) {
      updateHeaderStats();
      renderSummary();
      renderContent();
      renderFindings();
      renderFilters();
      showToast(t.toastManualAdded(added), 'success');
    } else {
      showToast(t.toastManualNotFound, 'danger');
    }
  }

  $('tooltipConfirm').addEventListener('click', confirmManualFinding);
  $('tooltipCancel').addEventListener('click', hideAddFindingTooltip);
}
