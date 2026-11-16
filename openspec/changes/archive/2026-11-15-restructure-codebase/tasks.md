# Tasks: restructure-codebase

## 1. Levantamento e preparação

- [x] 1.1 Diff sistemático entre `pdf-safe-brazil.html` e `pdf-safe-usa.html`: catalogar toda diferença que não seja regex/strings/CSS (candidatas a diferença funcional escondida) e decidir preservar ou unificar cada uma
- [x] 1.2 Diff entre `index.html` e `index-usa.html` com o mesmo critério
- [x] 1.3 Inventariar todas as strings de UI dos 4 HTMLs e montar a tabela de chaves i18n (mesmo conjunto de chaves para pt-BR e en-US), já com a terminologia nova ("Anonimizar" / "Redact")

## 2. Extração dos módulos puros

- [x] 2.1 Criar `js/rules/br.js` e `js/rules/us.js` com `REGEX_DB`, `CATEGORIES` e validadores (mod-11 etc.) exportados
- [x] 2.2 Criar `js/detector.js` com `detectSensitiveData` + resolução de overlap, recebendo (texto, rules) e sem nenhuma referência a DOM/window/storage — comportamento idêntico ao atual, incluindo first-by-index no overlap
- [x] 2.3 Criar `js/markdown.js` com `convertToMarkdown` puro
- [x] 2.4 Verificar pureza: `node -e "import('./js/detector.js').then(...)"` roda uma detecção de exemplo sem erro

## 3. Extração de CSS e i18n

- [x] 3.1 Criar `css/app.css` (comum aos dois apps; resolver as 73 linhas divergentes conforme o catálogo de 1.1) e `css/landing.css`
- [x] 3.2 Criar `js/i18n/pt-BR.js` e `js/i18n/en-US.js` com as chaves de 1.3, incluindo nomes de download `documento_anonimizado.md` / `redacted_document.md`

## 4. App unificado e shells

- [x] 4.1 Criar `js/app.js` com todo o fluxo de UI/estado, exportando `boot(rules, i18n)`; renomear identificadores `sanitizeAll`→`anonymizeAll`, `isSanitized`→`isAnonymized`, `sanitizedMarkdown`→`anonymizedMarkdown` etc.
- [x] 4.2 Reescrever `pdf-safe-brazil.html` como shell fino: head (fonts, CDN com SRI, CSP, `css/app.css`) + estrutura DOM + `<script type="module">` importando rules/br, i18n/pt-BR e `boot()`
- [x] 4.3 Reescrever `pdf-safe-usa.html` como shell equivalente com rules/us e i18n/en-US
- [x] 4.4 Atualizar `index.html` e `index-usa.html`: extrair CSS para `css/landing.css`, aplicar terminologia nova nos textos das landings

## 5. CSP e SRI

- [x] 5.1 Gerar hashes SRI de `pdf.min.js` 3.11.174 e `marked.min.js` 9.1.6 e adicionar `integrity` + `crossorigin="anonymous"` nas tags
- [x] 5.2 Adicionar `<meta http-equiv="Content-Security-Policy">` nos 4 HTMLs conforme design (D4), com `connect-src 'none'`
- [x] 5.3 Validar o worker do pdf.js sob CSP carregando um PDF real com DevTools aberto; se houver violação, aplicar o fallback do design (worker local) e ajustar a CSP

## 6. Verificação e docs

- [x] 6.1 Smoke test completo nas 4 páginas via `npx serve`: carregar PDF, revisar achados, dispensar item, anonimizar, baixar `.md` — zero erros/violações no console
- [x] 6.2 Verificar equivalência de detecção: mesmo PDF processado no código antigo (git stash/worktree) e no novo produz os mesmos achados
- [x] 6.3 Teste offline: com a página carregada, desligar a rede e completar o fluxo
- [x] 6.4 Varredura final de terminologia: `grep -ri sanit` não retorna nenhuma ocorrência voltada ao usuário (UI, landings, README)
- [x] 6.5 Atualizar `README.md`: nova estrutura de pastas, perda do `file://` (**BREAKING**), instrução `npx serve`, terminologia nova

## 7. Correção pós-entrega

- [x] 7.1 Corrigir reflow da lista de achados que fazia um clique atingir o item vizinho (ver D7 no design)
- [x] 7.2 Revalidar exclusão/restauração nas duas edições: item a item, filtros, duplo-clique real, anonimizar
