# Proposal: restructure-codebase

## Why

Hoje o app vive em 4 arquivos HTML monolíticos (5.686 linhas) onde as versões BR e US são o mesmo código duplicado com regex e ~40 strings trocadas — qualquer correção precisa ser feita duas vezes e diverge com o tempo. Além disso, a promessa central do produto ("nada sai da sua máquina") é apenas uma afirmação no README, sem garantia técnica, e a terminologia "Sanitização" está juridicamente incorreta perante a LGPD.

Esta é a mudança-fundação: as próximas (testes de detecção, multi-arquivo, pseudonimização reversível) dependem de código modular e importável.

## What Changes

- Extrair CSS e JavaScript dos 4 HTMLs para arquivos separados (`css/`, `js/`), usando ES Modules.
- Desduplicar `pdf-safe-brazil.html` e `pdf-safe-usa.html`: viram shells finos que importam o mesmo `app.js`, parametrizado por locale (`rules/br.js`, `rules/us.js`, `i18n/pt-BR.js`, `i18n/en-US.js`).
- Isolar as funções puras `detectSensitiveData` e `convertToMarkdown` em módulos próprios (`detector.js`, `markdown.js`), importáveis em Node para os testes da próxima change.
- Adicionar SRI (`integrity`) aos scripts de CDN (pdf.js, marked) e CSP via `<meta>` com `connect-src 'none'` — a premissa local vira garantia verificável (com `worker-src` ajustado para o worker do pdf.js).
- Renomear "Sanitização" → "Anonimização" em toda a UI, nomes de arquivo baixado, landing pages e README (edição US: *de-identification*/*redact*).
- **BREAKING**: abrir os HTML via `file://` (duplo clique) deixa de funcionar — ES Modules exigem servidor HTTP. GitHub Pages e Cloudflare Pages não são afetados; dev local passa a usar `npx serve` (documentado no README).

## Capabilities

### New Capabilities

- `static-app-shell`: estrutura modular do app servido como site estático — shells HTML finos, ES Modules, sem build step, URLs públicas preservadas em GitHub Pages e Cloudflare Pages.
- `local-processing-guarantee`: garantia técnica de processamento 100% client-side — CSP bloqueando conexões de saída, SRI nas dependências de CDN.
- `localization`: strings de interface extraídas em módulos i18n (pt-BR, en-US) com terminologia correta — "Anonimização" no lugar de "Sanitização".

### Modified Capabilities

(nenhuma — não existem specs anteriores; este é o primeiro change do projeto)

## Impact

- **Código**: `index.html`, `index-usa.html`, `pdf-safe-brazil.html`, `pdf-safe-usa.html` encolhem drasticamente; novos diretórios `css/` e `js/` (com `js/rules/` e `js/i18n/`).
- **Comportamento do usuário final**: nenhum — mesmas URLs, mesmo fluxo, mesma detecção. Apenas os textos "Sanitização" mudam para "Anonimização" e o nome do arquivo baixado muda (ex.: `documento_anonimizado.md`).
- **Hospedagem**: sem mudança de configuração; caminhos relativos funcionam em ambos os provedores.
- **Dependências**: pdf.js 3.11.174 e marked 9.1.6 continuam via CDN, agora com SRI fixando as versões.
- **Docs**: README atualizado (perda do `file://`, instrução de dev local, nova terminologia).
- **Changes futuras desbloqueadas**: `detection-tests` (importa `detector.js` puro), `multi-file-batch` e `reversible-pseudonymization` (estado por documento e vault entram em módulos novos).
