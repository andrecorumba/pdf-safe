// ═══════════════════════════════════════════════════
//  UI STRINGS — Português (BR)
//
//  Category and rule labels are not here: they name locale-specific concepts
//  (CPF, RG) and live with the rules that define them, in js/rules/br.js.
// ═══════════════════════════════════════════════════
export const i18n = {
  lang: 'pt-BR',
  title: 'PDF Safe — Anonimizador de Dados Sensíveis',

  // Header
  logoTag: 'Anonimizador LGPD',
  githubTitle: 'Ver no GitHub',
  languageTitle: 'Idioma',
  statItems: 'itens',
  statCategories: 'categorias',
  statPages: 'páginas',

  // Upload
  uploadTitle: 'Arraste um PDF aqui ou clique para selecionar',
  uploadSub: 'Processamento 100% local — nenhum dado sai do seu navegador',
  changeFile: 'Trocar',
  invalidPdf: 'Selecione um arquivo PDF válido',

  // Processing
  extractingText: 'Extraindo texto do PDF...',
  extractingPage: (page, total) => `Extraindo página ${page} de ${total}...`,
  convertingMarkdown: 'Convertendo para Markdown...',
  detectingData: 'Detectando dados sensíveis...',
  processingDone: (n) => `Concluído! ${n} itens encontrados.`,
  processingError: (msg) => 'Erro ao processar PDF: ' + msg,

  // Toolbar
  tabHighlighted: '🔍 Destacado',
  tabMarkdown: '📝 Markdown',
  tabPreview: '👁️ Preview',
  actionAnonymize: '🔒 Anonimizar Tudo',
  actionDownload: '⬇ Baixar .md',
  actionCopy: '📋 Copiar',
  actionReset: '↺ Novo',

  // Summary and filters
  summaryTotal: 'Total encontrado',
  summaryCategories: 'Categorias',
  filterAll: 'Todos',
  filterDismissed: (n) => `🚫 ${n} excluído${n > 1 ? 's' : ''}`,

  // Left panel
  panelHighlighted: 'Texto com Destaques',
  panelAnonymized: 'Texto Anonimizado',
  panelRawMarkdown: 'Markdown Raw',
  panelPreview: 'Preview Renderizado',
  badgeClean: '🔒 Limpo',
  badgeItems: (n) => `${n} itens`,

  // Findings panel
  panelFindings: 'Dados Encontrados',
  noItemsForFilters: 'Nenhum item visível com os filtros atuais',
  noSensitiveData: 'Nenhum dado sensível encontrado',
  dismissTitle: 'Excluir (falso positivo)',
  restoreTitle: 'Restaurar item',
  dismissedHeader: (n) => `🚫 Excluídos (${n})`,
  dismissedToggle: (shown) => `clique para ${shown ? 'ocultar' : 'ver'}`,
  suggestionTag: 'sugestão de baixa confiança',
  suggestionTitle: 'Detecção de baixa confiança: não será anonimizada, a menos que você restaure o item',
  toastDismissed: '🚫 Item excluído — não será anonimizado',
  toastRestored: '✅ Item restaurado',

  // Anonymization
  toastAnonymizeUndone: 'Anonimização removida — texto original restaurado',
  toastAnonymized: (n) => `✅ ${n} dados sensíveis substituídos com sucesso!`,
  downloadFileName: 'documento_anonimizado.md',
  downloadFileNameOriginal: 'documento.md',
  toastDownloaded: '📥 Markdown baixado!',
  toastCopied: '📋 Copiado para a área de transferência!',

  // Manual selection
  tooltipHeader: '✏️ Adicionar como dado sensível',
  tooltipReplacementPlaceholder: 'Substituir por (padrão: [OCULTADO])',
  tooltipAdd: '➕ Adicionar',
  tooltipCancel: 'Cancelar',
  defaultReplacement: '[OCULTADO]',
  toastManualAdded: (n) => `✏️ ${n} ocorrência${n > 1 ? 's' : ''} adicionada${n > 1 ? 's' : ''} manualmente`,
  toastManualNotFound: 'Texto não encontrado no documento ou já mapeado',
};
