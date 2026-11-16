# Design: restructure-codebase

## Context

O repositório tem 4 HTMLs monolíticos (5.686 linhas, zero dependências locais, sem build step), hospedados como estáticos no GitHub Pages e Cloudflare Pages:

- `index.html` / `index-usa.html` (993 linhas cada) — landings PT/EN
- `pdf-safe-brazil.html` (1.905) / `pdf-safe-usa.html` (1.795) — o app em si

Os dois apps são o mesmo código com três diferenças: `REGEX_DB`, `CATEGORIES` e ~40 strings de UI. O CSS (~810 linhas) difere em só 73 linhas. O pipeline já tem funções puras no centro (`detectSensitiveData`, `convertToMarkdown`) enroladas em estado global de UI. Dependências via CDN sem SRI: pdf.js 3.11.174, marked 9.1.6 (cdnjs) + Google Fonts; o worker do pdf.js é configurado via `GlobalWorkerOptions.workerSrc` apontando para o CDN.

Decisões já tomadas na exploração (ver `mudancas/exploracao-01.md`): abandonar `file://`, manter CDN com SRI + CSP, terminologia "Anonimização".

## Goals / Non-Goals

**Goals:**
- Uma única base de código para BR e US, parametrizada por locale.
- `detector.js` e `markdown.js` puros e importáveis em Node (fundação para `detection-tests`).
- CSP + SRI transformando "nada sai da máquina" em garantia verificável.
- Terminologia "Anonimização" (PT) / "De-identification"/"Redact" (EN) em UI, downloads e docs.
- URLs públicas inalteradas; deploy contínuo sem janela quebrada.

**Non-Goals:**
- Nenhuma mudança nos regex ou na lógica de detecção (fica para `detection-tests`).
- Nenhum recurso novo (multi-arquivo, pseudonimização — changes futuras).
- Nenhum build step, bundler ou framework.
- Vendorizar as libs (CDN + SRI decidido).

## Decisions

### D1 — ES Modules, sem suporte a `file://`
`<script type="module">` nos shells. Alternativa rejeitada: scripts clássicos em ordem de carga — manteria `file://` mas os módulos não seriam importáveis em Node sem gambiarras de globals, minando a change de testes. Baseline de navegador já exige lookbehind em regex (mais novo que ES Modules), então nada muda em compatibilidade real. Dev local: `npx serve` (documentar no README).

### D2 — Estrutura de diretórios

```
pdf-safe/
├── index.html, index-usa.html        landings (mesmas URLs)
├── pdf-safe-brazil.html              shell fino: <script type="module">
├── pdf-safe-usa.html                   import { boot } from './js/app.js'; boot('pt-BR' | 'en-US')
├── css/
│   ├── app.css                       CSS do app (comum; as 73 linhas divergentes viram regras por locale ou se unificam)
│   └── landing.css                   CSS das landings
└── js/
    ├── app.js                        UI/fluxo/estado (hoje duplicado ×2)
    ├── detector.js                   detectSensitiveData + resolução de overlap — PURO, sem DOM
    ├── markdown.js                   convertToMarkdown — PURO, sem DOM
    ├── rules/br.js, rules/us.js      REGEX_DB + CATEGORIES + validadores (mod-11 etc.)
    └── i18n/pt-BR.js, en-US.js       strings de UI + nomes de arquivo de download
```

`boot(locale)` seleciona rules + i18n via import estático no shell (cada shell importa seu par), evitando import dinâmico e mantendo o grafo analisável.

### D3 — Pureza de `detector.js` e `markdown.js`
Contrato: esses dois módulos não referenciam `document`, `window`, `localStorage` nem variáveis de módulo mutáveis; recebem texto + rules e devolvem dados. É o que permite `node --test` importar direto na próxima change. A resolução de overlap atual (first-by-index) é movida **sem alteração de comportamento** — corrigir a divergência com o README é assunto de `detection-tests`.

### D4 — CSP via `<meta>` + SRI
Nos 4 HTMLs:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'none';
  worker-src blob: https://cdnjs.cloudflare.com;">
```

- `connect-src 'none'` é a garantia central: nenhum fetch/XHR/WebSocket sai da página.
- pdf.js baixa o worker via tag script do CDN, e dependendo do modo cria worker de `blob:` — por isso `worker-src blob: https://cdnjs.cloudflare.com`. **Validar no navegador durante a implementação**; se o pdf.js fizer fetch do worker (afetado por `connect-src`), o fallback é apontar `workerSrc` para cópia local só do worker (exceção pontual à decisão de não vendorizar, limitada a 1 arquivo).
- SRI (`integrity` + `crossorigin="anonymous"`) em pdf.min.js e marked.min.js, hashes gerados na implementação. Google Fonts não suporta SRI (CSS dinâmico); o risco é aceito — fonte não lê dados — ou o CSS das fonts é inlined.
- Alternativa rejeitada: headers via `_headers` (Cloudflare) — GitHub Pages não suporta headers customizados; `<meta>` funciona nos dois.

### D5 — Renomeação como parte da extração i18n
"Sanitização"→"Anonimização" não é um find-replace nos HTMLs: as strings migram para `i18n/*.js` já com o texto novo (~67 ocorrências entre os 4 HTMLs + README). Identificadores de código (`sanitizeAll`, `isSanitized`, `sanitizedMarkdown`) são renomeados para `anonymizeAll`/`isAnonymized`/etc. na migração para módulos — renomear identificador é grátis quando o código já está sendo movido. Nome do download: `documento_anonimizado.md` / `redacted_document.md`.

### D6 — Migração em um único commit lógico
O site quebra se o shell novo apontar para JS que ainda não existe (ou vice-versa). A migração é bottom-up no working tree (módulos primeiro, shells por último) mas publicada como um deploy único. Rollback: `git revert` — nenhum estado externo (sem build, sem migração de dados).

## Risks / Trade-offs

- [CSP mal calibrada quebra pdf.js/fonts silenciosamente em produção] → testar as 4 páginas com DevTools aberto (violações de CSP aparecem no console) antes do deploy; smoke test manual: carregar PDF, detectar, anonimizar, baixar.
- [Regressão de comportamento na desduplicação BR/US — os 73 diffs de CSS e strings escondem diferenças funcionais] → diff sistemático dos dois HTMLs antes de unificar; qualquer diferença que não seja regex/strings/CSS é catalogada e preservada explicitamente.
- [SRI congela versões: CDN não pode atualizar sem quebrar] → é o comportamento desejado (integridade > frescor); atualização de lib vira mudança consciente de hash.
- [Usuários que abriam via `file://` perdem o fluxo] → **BREAKING** documentado no README com alternativa (`npx serve` ou usar as URLs públicas).
- [Renomear identificadores + mover código no mesmo passo dificulta o diff] → aceito: o diff dessa change é ilegível de qualquer forma (5.686 linhas movidas); a validação é funcional (smoke test), não por leitura de diff.

## Catálogo do diff BR × US (resultado das tarefas 1.1–1.3)

Diff por seção, com as duas páginas alinhadas (BR: head 1–9, CSS 10–819, DOM 821–957, JS 958–1903):

| Seção | Diferenças encontradas | Veredito |
|---|---|---|
| head | `lang`, `<title>` | i18n |
| CSS (77 linhas) | bloco `.header-stats` em posição diferente; nomes `.hl-<categoria>` | drift + nomenclatura; **nenhuma diferença visual** |
| DOM (108 linhas) | strings, lista de `<option>`, SVG da bandeira + estado `active`, posição do bloco `header-stats`, `gap:10px` vs `1.5rem` | i18n + drift |
| JS (619 linhas) | strings, mapas indexados por categoria (`colorMap`, `typeColors`, `hlMap`, `labelMap`) | i18n + metadados de categoria |

**Única diferença funcional real encontrada** — em `convertToMarkdown`, o regex de cabeçalho:
`/^([A-ZÀ-ÚÇ\s]{4,60})$/gm` (BR) vs `/^([A-Z\s]{4,60})$/gm` (US). É legítima (acentuação) e passa a ser parametrizada como `headingPattern` nas rules.

Decorrências que refinam D2/D3:

- **D2a — `hl` é dado redundante.** Verificado: em 100% das regras `hl === 'hl-' + cat`. O campo sai das regras; a classe de destaque passa a derivar de `CATEGORIES[cat].tone`.
- **D2b — quatro mapas de cor viram um `tone`.** `colorMap`, `typeColors` e as classes `.hl-*` são três projeções da mesma identidade de categoria. Unificados em `CATEGORIES[cat] = { tone, summary }`, com CSS declarando 12 tons (`.tone-danger` … `.tone-slate`) via custom properties. Cores idênticas às atuais.
- **D2c — CSS unificado de verdade.** Como as únicas divergências eram ordem de bloco e nomes de classe, `css/app.css` é um arquivo só, sem regras por locale. As 3 divergências cosméticas das landings (padding/min-width/font-size do seletor de idioma) adotam os valores BR, que acomodam o rótulo mais longo.
- **D4a — `onclick` inline tem de morrer.** Não é escolha estética: ES Modules não expõem funções globais **e** a CSP sem `'unsafe-inline'` bloqueia handlers inline. Handlers estáticos viram `addEventListener`; os de HTML gerado (filtros, dispensar, restaurar) viram delegação de evento com `data-*`.
- **D4b — bootstrap externo.** Script de módulo inline também é barrado pela CSP, então cada shell carrega `js/boot-br.js` / `js/boot-us.js` (4 linhas cada) em vez de um `<script type="module">` inline.
- **D2d — markup em `js/template.js`.** Como o DOM só diferia em texto, o markup do app é escrito uma vez como função de template e injetado em `<div id="app">`. Assim os shells ficam realmente finos (~30 linhas) e não há markup duplicado.
- **Rótulos de categoria ficam nas rules, não no i18n.** `CPF`, `Placa Mercosul`, `SSN` nomeiam conceitos que só existem naquele locale — vivem junto das regras que os definem. O i18n guarda o texto do chrome da interface; nenhum módulo de aplicação (`app.js`, `template.js`, `detector.js`, `markdown.js`) contém texto de UI.
- **Preservações explícitas de comportamento**: a lista de categorias do tooltip manual **não** inclui CEP/ZIP e usa rótulos no singular (com "Outro"/"Other" para `manual`), diferentes dos rótulos de filtro no plural. Preservado via `MANUAL_CATEGORIES` (lista ordenada) e campos `singular`/`option`. O campo `color` de `CATEGORIES` era dado morto e foi removido.

## D7 — Lista de achados estável sob o ponteiro (correção de bug reportado)

Dispensar um achado removia a linha da lista na hora e mandava para a seção "Excluídos" no rodapé. Todas as linhas de baixo subiam — inclusive uma para exatamente debaixo do cursor. O clique seguinte no mesmo ponto atingia **outro** achado. Reproduzido: dois cliques no mesmo pixel dispensaram os índices 6 e 7; com valores repetidos no documento (o mesmo nome várias vezes) o efeito é indistinguível de "um clique excluiu vários".

Bug **pré-existente** — o código original tinha o mesmo `renderFindings()` completo a cada dispensa. Verificado servindo o `git HEAD` em paralelo.

Correção: enquanto o ponteiro está dentro de `#findingsList`, a linha clicada é reestilizada **no lugar** (classe `dismissed` + botão troca para "+"), e o redesenho que reorganiza a lista fica pendente até o `mouseleave`. `renderSummary` e `renderFilters` entram no mesmo adiamento — o chip "🚫 N excluídos" pode quebrar a linha da barra de filtros e empurrar o painel para baixo, que é a mesma armadilha. Um `renderFindings()` disparado por outra ação (filtro, anonimizar) cancela o pendente, já que redesenha tudo a partir do estado.

Alternativas descartadas: ignorar cliques repetidos por tempo/posição (heurística que não cobre o caso mais comum — o usuário mirar na linha seguinte depois que a lista pulou); e renderizar dispensados sempre no lugar (elimina a seção "Excluídos", que é um recurso existente).

## Open Questions

- Nenhuma bloqueante. Confirmar na implementação: modo exato de carga do worker do pdf.js 3.11.174 sob CSP.
