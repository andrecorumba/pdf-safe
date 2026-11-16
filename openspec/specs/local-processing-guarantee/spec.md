# local-processing-guarantee Specification

## Purpose
Garante tecnicamente que o processamento é 100% client-side: CSP bloqueando conexões de saída e SRI nas dependências de CDN, para que nenhum conteúdo de documento saia do navegador.

## Requirements

### Requirement: Bloqueio de conexões de saída via CSP
Cada uma das 4 páginas SHALL declarar uma Content-Security-Policy via `<meta http-equiv>` com `connect-src 'none'`, impedindo qualquer `fetch`, XHR ou WebSocket iniciado pela página.

#### Scenario: Tentativa de exfiltração é bloqueada
- **WHEN** qualquer script na página tenta realizar `fetch()` ou abrir um WebSocket para qualquer origem
- **THEN** o navegador bloqueia a requisição por violação de CSP

#### Scenario: CSP não quebra o funcionamento normal
- **WHEN** o usuário executa o fluxo completo (carregar PDF, detectar, anonimizar, baixar) com o DevTools aberto
- **THEN** nenhuma violação de CSP aparece no console e o fluxo completa com sucesso, incluindo o worker do pdf.js

### Requirement: Integridade das dependências de CDN
Os scripts de terceiros (`pdf.min.js`, `marked.min.js`) SHALL ser carregados com atributo `integrity` (SRI) e `crossorigin="anonymous"`, fixando o conteúdo exato servido pelo CDN.

#### Scenario: CDN comprometido é neutralizado
- **WHEN** o CDN serve um conteúdo diferente do hash declarado no atributo `integrity`
- **THEN** o navegador recusa a execução do script

#### Scenario: Conteúdo íntegro carrega normalmente
- **WHEN** o CDN serve o conteúdo original das versões fixadas (pdf.js 3.11.174, marked 9.1.6)
- **THEN** os scripts carregam e o app funciona normalmente

### Requirement: Processamento integral no cliente
Todo o processamento de PDF e detecção de dados sensíveis SHALL ocorrer no navegador do usuário; nenhum conteúdo de documento SHALL ser transmitido a qualquer servidor.

#### Scenario: Uso offline após carga da página
- **WHEN** a página já está carregada (incluindo dependências de CDN) e a conexão de rede é desligada
- **THEN** o usuário consegue carregar um PDF, revisar achados, anonimizar e baixar o resultado normalmente
