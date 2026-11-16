# localization Specification

## Purpose
Mantém as strings de interface em módulos i18n (pt-BR e en-US) com a terminologia correta, usando "Anonimização" no lugar de "Sanitização".

## Requirements

### Requirement: Strings de interface centralizadas por locale
Todas as strings visíveis ao usuário (rótulos, botões, mensagens, títulos, nomes de arquivo de download) SHALL residir em módulos i18n (`i18n/pt-BR.js`, `i18n/en-US.js`), sem strings de interface hardcoded nos módulos de aplicação.

#### Scenario: Alterar um texto edita um único arquivo
- **WHEN** um texto de interface da versão BR precisa mudar
- **THEN** a mudança ocorre apenas em `i18n/pt-BR.js`, sem tocar em `app.js` ou nos HTMLs

#### Scenario: Paridade de chaves entre locales
- **WHEN** os módulos `pt-BR` e `en-US` são comparados
- **THEN** ambos definem exatamente o mesmo conjunto de chaves

### Requirement: Terminologia "Anonimização" na versão BR
A interface em português SHALL usar "Anonimização"/"Anonimizar" (e derivados) no lugar de "Sanitização"/"Sanitizar" em todas as páginas, textos de landing, nome do arquivo baixado e README.

#### Scenario: UI do app BR
- **WHEN** o usuário acessa `pdf-safe-brazil.html`
- **THEN** nenhuma ocorrência de "Sanitização"/"Sanitizar" é exibida; as ações usam "Anonimizar"

#### Scenario: Nome do arquivo baixado
- **WHEN** o usuário baixa o documento processado na versão BR
- **THEN** o arquivo se chama `documento_anonimizado.md`

### Requirement: Terminologia de de-identification na versão US
A interface em inglês SHALL usar a terminologia "de-identification"/"redact" (alinhada a HIPAA) no lugar de "sanitize"/"sanitizer", incluindo título da página, ações e nome do arquivo baixado.

#### Scenario: UI do app US
- **WHEN** o usuário acessa `pdf-safe-usa.html`
- **THEN** as ações e títulos usam "Redact"/"De-identification" e o download se chama `redacted_document.md`
