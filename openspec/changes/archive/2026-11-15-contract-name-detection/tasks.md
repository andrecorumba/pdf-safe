# Tasks: contract-name-detection

## 1. Infraestrutura de testes e fixtures

- [x] 1.1 Criar `package.json` mínimo (`"type": "module"`, script `test` = `node --test`, sem dependências) e `tests/`; verificar que `npm test` roda e que as 4 páginas continuam carregando sem erro no console
- [x] 1.2 Criar três contratos sintéticos em `tests/fixtures/` (locação, prestação de serviços com pessoa jurídica, compra e venda), cada um com preâmbulo de qualificação, cláusulas com termos definidos, bloco de assinatura e testemunhas, e um arquivo com as pessoas e empresas esperadas; verificar que nenhum dado é real (CPFs e CNPJs gerados, nomes inventados)
- [x] 1.3 Escrever um teste de caracterização que registra os achados de nome das regras atuais sobre os fixtures (falsos positivos e nomes perdidos) como linha de base; verificar que ele passa antes de qualquer mudança

## 2. Confiança no detector

- [x] 2.1 Em `js/detector.js`, adicionar `confidence` a cada achado (`'high'` quando a regra não declara) e aceitar o terceiro parâmetro `detectors`; verificar com teste que um achado de regra sem `confidence` sai com `'high'` e que achados de um detector em função são incluídos
- [x] 2.2 Trocar a resolução de sobreposição para confiança decrescente e depois `index` (D8); verificar com testes os cenários de `specs/detection-confidence` e com um teste de regressão que, sobre um texto com regras US e BR numéricas, o resultado é idêntico ao do algoritmo anterior

## 3. Forma de nome e âncoras de pessoa

- [x] 3.1 Criar `js/names/shape.js` com a gramática de nome sensível a caixa, partículas, sufixos e a normalização (NFC, sem acentos, maiúsculas); verificar com testes os cenários de "Forma de um nome", incluindo o que proíbe atravessar quebra de linha
- [x] 3.2 Criar `js/names/br.js` com o percurso por linha (prefixo `## ` transparente) e a âncora de rótulo com `:`, incluindo a lista única de papéis e os rótulos `Nome...` compostos; verificar com testes os cenários de "Nome após rótulo de papel" e "Papel sem dois-pontos é termo definido"
- [x] 3.3 Implementar as âncoras de qualificação à direita, tratamento e `representado(a) por`; verificar com testes os cenários correspondentes de `specs/person-name-detection`
- [x] 3.4 Implementar as âncoras de bloco de assinatura, vizinhança de CPF/RG e lista de testemunhas; verificar com testes os cenários correspondentes, incluindo a linha de assinatura convertida em título
- [x] 3.5 Garantir que o achado cobre só o nome e usa a substituição `[NOME OCULTADO]`; verificar com teste que anonimizar `LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO, brasileiro` produz `LOCADOR: [NOME OCULTADO], brasileiro`

## 4. Léxico e sequências sem âncora

- [x] 4.1 Gerar `js/data/prenomes-br.js` a partir dos dados públicos de nomes do IBGE (prenomes mais frequentes, normalizados; 1.595 obtidos, tamanho aceito pelo usuário), com fonte, data e critério de corte no cabeçalho; verificar que o arquivo exporta um `Set`, tem menos de 60 KB e contém prenomes de controle (`MARIA`, `JOAO`, `ANA`, `RICARDO`)
- [x] 4.2 Implementar a detecção sem âncora condicionada ao léxico (3+ palavras em média, 2 em baixa) e o descarte da palavra inicial que não é prenome na âncora de qualificação; verificar com testes os cenários de "Sequência sem âncora depende de prenome conhecido" e o de "Palavra inicial que não é prenome"

## 5. Empresas

- [x] 5.1 Implementar a detecção de razão social por sufixo societário e por qualificação de pessoa jurídica, e a classificação pessoa/empresa do texto capturado por âncora (D6); verificar com testes os cenários de `specs/company-name-detection`, incluindo o sufixo isolado
- [x] 5.2 Adicionar `empresa` a `CATEGORIES` e `MANUAL_CATEGORIES` em `js/rules/br.js`, com tom novo em `css/app.css`; verificar no navegador que o filtro, a contagem, o destaque e a marcação manual da categoria funcionam

## 6. Propagação

- [x] 6.1 Implementar a propagação de nomes e razões sociais confirmados (D7), com herança de confiança e fronteira de palavra; verificar com testes os cenários de propagação das duas specs e a invariante de índices entre texto normalizado e original

## 7. Integração nas regras BR e na interface

- [x] 7.1 Exportar `DETECTORS` em `js/rules/br.js`, remover `nome_label`, `nome_caps` e a lista de stopwords, e repassar `rules.DETECTORS ?? []` em `js/app.js`; verificar que os testes de fixture passam (todas as pessoas e empresas esperadas encontradas, nenhum achado de nome ou empresa fora da lista com confiança alta ou média) e substituir a linha de base de 1.3 por esses testes
- [x] 7.2 Em `js/app.js`, iniciar `dismissed` com os achados de baixa confiança (também após `resetApp`) e marcar na seção de dispensados os que são sugestão não tocada pelo usuário; adicionar as strings em `js/i18n/pt-BR.js` e `js/i18n/en-US.js`; verificar no navegador os três cenários de "Baixa confiança começa dispensada"
- [x] 7.3 Atualizar `README.md`: nova categoria Empresa, níveis de confiança, achado que cobre só o nome, limitações conhecidas (nome de duas palavras sem âncora começa dispensado; prenomes fora do léxico) e como rodar os testes; verificar que `npm test` roda como documentado

## 8. Ajustes aprovados após a primeira verificação

- [x] 8.1 Implementar a continuação de nome na linha seguinte (D14) em todas as âncoras e na propagação; verificar com testes os cenários de "Nome continuado na linha seguinte" e com um fixture cujas linhas são separadas por linha em branco, como na extração real do pdf.js
- [x] 8.2 Exigir prenome do léxico na âncora de assinatura sem tracejado (D15); verificar com testes os dois cenários novos de "Nome em bloco de assinatura"
- [x] 8.3 Condicionar a continuação aos indícios de nome incompleto e aceitar uma linha em branco entre o nome e a linha só com o papel na âncora de assinatura; verificar com testes os cenários de "Continuação exige indício de nome incompleto" e um teste de assinatura com linha em branco antes do papel

## 9. Verificação de integração

- [ ] 9.1 Rodar `npm test` completo e, no navegador, o fluxo inteiro (carregar PDF, revisar, anonimizar, baixar) nas edições BR e US com o DevTools aberto; verificar que não há violação de CSP nem erro no console e que a edição US produz os mesmos achados de antes em um PDF de teste
- [ ] 9.2 Validar com 2 ou 3 contratos reais do usuário, sem versioná-los: registrar quantos nomes foram encontrados, perdidos e falsos, e transformar cada formato não coberto em novo fixture sintético ou em item para uma change seguinte
