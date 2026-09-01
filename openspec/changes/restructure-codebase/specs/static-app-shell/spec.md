# static-app-shell

## ADDED Requirements

### Requirement: Servir como site estático sem build step
O app SHALL ser servido como arquivos estáticos (HTML, CSS, JS via ES Modules) sem etapa de build, funcionando em GitHub Pages e Cloudflare Pages com caminhos relativos.

#### Scenario: Deploy em hosting estático
- **WHEN** o conteúdo do repositório é publicado tal como está no GitHub Pages ou Cloudflare Pages
- **THEN** as 4 páginas (`index.html`, `index-usa.html`, `pdf-safe-brazil.html`, `pdf-safe-usa.html`) carregam e funcionam sem erros de console

#### Scenario: Dev local via servidor HTTP
- **WHEN** o desenvolvedor serve a raiz do repositório com qualquer servidor HTTP simples (ex.: `npx serve`)
- **THEN** o app funciona de forma idêntica à produção

### Requirement: URLs públicas preservadas
As URLs existentes das 4 páginas SHALL permanecer inalteradas após a reestruturação.

#### Scenario: Links externos continuam válidos
- **WHEN** um usuário acessa `/pdf-safe-brazil.html` (ou qualquer das outras 3 páginas) por um link antigo
- **THEN** a página carrega normalmente, sem redirecionamento nem 404

### Requirement: Base de código única para BR e US
As páginas BR e US SHALL compartilhar os mesmos módulos de aplicação (`app.js`, `detector.js`, `markdown.js`), diferindo apenas em módulos de regras (`rules/br.js`, `rules/us.js`) e de strings (`i18n/pt-BR.js`, `i18n/en-US.js`).

#### Scenario: Correção aplicada uma vez vale para os dois
- **WHEN** um defeito de fluxo de UI é corrigido em `app.js`
- **THEN** a correção vale para `pdf-safe-brazil.html` e `pdf-safe-usa.html` sem edição duplicada

#### Scenario: Shell seleciona o locale
- **WHEN** `pdf-safe-brazil.html` é carregado
- **THEN** o app inicializa com as regras BR e strings pt-BR
- **WHEN** `pdf-safe-usa.html` é carregado
- **THEN** o app inicializa com as regras US e strings en-US

### Requirement: Módulos de detecção puros e importáveis
`detector.js` (detecção + resolução de overlap) e `markdown.js` (conversão para Markdown) SHALL ser módulos puros: sem referência a DOM, `window`, storage ou estado mutável de módulo, importáveis em Node.js sem polyfills.

#### Scenario: Importação em Node
- **WHEN** um script Node importa `detector.js` e chama a detecção com um texto e um conjunto de regras
- **THEN** a função retorna os achados sem lançar erro por APIs de navegador ausentes

#### Scenario: Comportamento de detecção preservado
- **WHEN** o mesmo texto é processado antes e depois da reestruturação
- **THEN** os achados (categorias, posições e resolução de sobreposição) são idênticos aos do código monolítico

### Requirement: A lista de achados não se move sob o ponteiro
Enquanto o ponteiro estiver sobre a lista de achados, dispensar ou restaurar um item SHALL manter todas as linhas nas mesmas posições; a reorganização (mover o item para a seção "Excluídos") SHALL ser adiada até o ponteiro sair da lista.

#### Scenario: Dois cliques no mesmo ponto atingem o mesmo achado
- **WHEN** o usuário clica em "−" de um achado e clica de novo exatamente no mesmo ponto
- **THEN** o segundo clique atinge o mesmo achado (agora o botão "+" de restaurar), nunca um achado vizinho

#### Scenario: Reorganização ao sair da lista
- **WHEN** o usuário dispensa um achado e move o ponteiro para fora da lista
- **THEN** o achado passa para a seção "Excluídos", o contador é atualizado e o chip de dispensados aparece

### Requirement: Comportamento do usuário final preservado
O fluxo completo do usuário SHALL permanecer funcionalmente idêntico ao anterior à reestruturação: carregar PDF, extrair texto, revisar achados destacados, dispensar falsos positivos, anonimizar e baixar o `.md`.

#### Scenario: Smoke test do fluxo completo
- **WHEN** o usuário carrega um PDF, revisa os achados, aciona a anonimização e baixa o resultado
- **THEN** cada etapa se comporta como na versão monolítica, sem erros de console
