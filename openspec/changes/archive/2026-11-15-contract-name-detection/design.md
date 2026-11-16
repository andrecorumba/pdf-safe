# Design: contract-name-detection

## Context

Motivação e escopo: ver `proposal.md`. Requisitos: ver `specs/`.

Estado atual relevante:

- `js/detector.js` expõe `detectSensitiveData(text, regexDb)`: roda cada regra de `REGEX_DB`, aplica `validate` quando existe e resolve sobreposição mantendo o achado que começa primeiro. É um módulo puro, importável em Node.
- `js/rules/br.js` contém ~45 regras. As de nome são `nome_label` (flag `i` sobre o rótulo e sobre o nome) e `nome_caps` (qualquer sequência em CAPS, filtrada por ~80 stopwords). O `\s` de `nome_caps` atravessa quebras de linha.
- A detecção roda sobre o Markdown produzido por `convertToMarkdown`, que prefixa `## ` em linhas curtas em CAPS. Uma linha de assinatura em CAPS vira título.
- `js/app.js` guarda os achados em `findings` e os dispensados em `dismissed` (um `Set` de índices). Achados dispensados ficam fora dos destaques, das contagens e de `anonymizeAll`, e são listados numa seção recolhível com botão de restaurar.
- Não há `package.json` nem testes. O CSP das páginas tem `connect-src 'none'` e `script-src 'self'`.

Restrições: sem servidor, sem build step, sem dependências de runtime novas, CSP inalterado.

## Goals / Non-Goals

**Goals:**

- Detecção de nomes e empresas expressa como código testável em Node, não como mais entradas de regex.
- Mudança de contrato do detector compatível com a edição US sem tocar em `js/rules/us.js`.
- Reaproveitar o mecanismo de dispensa existente para a baixa confiança, em vez de criar um segundo estado na interface.

**Non-Goals:**

- Alterar `convertToMarkdown` ou a extração de texto do pdf.js.
- Pontuação numérica de confiança ou janelas de contexto para regras numéricas.
- Lista de dispensa persistente entre documentos.

## Decisions

### D1. Detectores em função, ao lado do `REGEX_DB`

`detectSensitiveData(text, regexDb, detectors = [])` passa a aceitar uma lista de funções `(text) => achados[]`. O módulo de regras BR exporta `DETECTORS` com o detector de nomes e empresas; `app.js` repassa `rules.DETECTORS ?? []`.

Âncoras como "linha após tracejado" ou "linha seguida de linha só com o papel" dependem de linhas vizinhas, e a propagação depende dos achados anteriores. Nada disso cabe em uma regex por regra.

Alternativa descartada: manter tudo em `REGEX_DB` com `validate` mais elaborado. O `validate` só enxerga o texto casado, não a vizinhança nem os outros achados.

### D2. Módulos novos

```
js/names/shape.js       gramática de nome (sensível a caixa) e normalização
js/names/br.js          âncoras de pessoa, âncoras de empresa, propagação
js/data/prenomes-br.js  léxico de prenomes (Set), só dados
```

`js/rules/br.js` importa `js/names/br.js` e exporta `DETECTORS`. Todos puros, sem DOM.

### D3. Gramática de nome única e sensível a caixa

Uma única definição de "palavra de nome" (inicial maiúscula + minúsculas, ou toda em maiúsculas, com apóstrofo e hífen internos), de partículas e de sufixos, usada por todas as âncoras. Separador entre palavras dentro da linha é `[ \t]`, nunca `\s`. A passagem para a linha seguinte é tratada à parte, pela regra de continuação (D14). Classes de caractere explícitas (`A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ`) no lugar de `À-Ú`, que inclui `×`.

Rótulos e papéis são casados sem distinção de caixa; o nome capturado é validado pela gramática sensível. Isso separa as duas coisas que a flag `i` misturava.

### D4. Processamento por linha, com `## ` transparente

O detector percorre o texto linha a linha, mantendo o deslocamento de cada linha para calcular `index`. Um prefixo `## ` é ignorado na avaliação das âncoras, mas não entra no achado. Assim a linha de assinatura que virou título continua detectável sem mexer em `markdown.js`.

Alternativa descartada: detectar antes da conversão para Markdown. Os índices dos achados precisam se referir ao texto exibido e anonimizado, que é o Markdown.

### D5. Âncoras e confiança

| Âncora | Confiança |
|---|---|
| Rótulo de papel ou `Nome...` seguido de `:` | alta |
| Qualificação à direita (`, brasileiro(a)`, `, portador(a)`, ...) | alta |
| Tratamento (`Sr.`, `Dra.`) e `representado(a) por` | alta |
| Bloco de assinatura (após tracejado; antes de linha só com papel) | alta |
| Nome antes de CPF/RG na mesma linha; item numerado após `TESTEMUNHAS` | média |
| Sem âncora, prenome do léxico, 3+ palavras de nome | média |
| Sem âncora, prenome do léxico, 2 palavras de nome | baixa |
| Propagação | herda |

A lista de papéis fica em um único array (masculino; feminino e plural derivados por sufixo), usado tanto para reconhecer rótulos quanto para reconhecer a "linha só com papel" da assinatura.

Na âncora de qualificação à direita, a sequência é estendida para a esquerda enquanto houver palavras de nome. Se a primeira palavra não é prenome do léxico e a seguinte é, a primeira é descartada (`Comparece Maria ...`).

Sem âncora, três palavras ficam em média (ativas) e duas em baixa (dispensadas): o caso de duas palavras é onde topônimos e expressões comuns colidem com prenomes (`Vitória da Conquista`), e o de três ou mais raramente é outra coisa. A alternativa de deixar todo achado sem âncora em baixa reduziria falsos positivos, mas um nome que só aparece sem âncora passaria sem ocultação por padrão.

### D6. Pessoa ou empresa

O texto capturado por uma âncora é classificado como empresa quando termina em sufixo societário ou é seguido de `, pessoa jurídica` ou `, inscrita no CNPJ`; caso contrário, pessoa. A detecção por sufixo também roda sem âncora, exigindo ao menos duas palavras antes do sufixo, na mesma linha, com forma capitalizada ou em CAPS. Isso evita que `ME` ou `SA` soltos virem empresa.

Empresas admitem tokens que nomes de pessoa não admitem: conectores em minúsculas, `&`, dígitos.

### D7. Propagação

Depois das âncoras, cada valor distinto de confiança alta ou média vira uma busca por ocorrências adicionais: comparação sobre o texto normalizado (sem acentos, em maiúsculas, espaços colapsados), com fronteira de palavra dos dois lados. Como a normalização por NFD + remoção de diacríticos preserva o número de caracteres quando o texto está em NFC, os índices no texto normalizado valem para o original; o texto é convertido para NFC antes, e um teste cobre essa invariante.

Só o nome completo é propagado. Variantes parciais ficam fora (ver `proposal.md`).

### D8. Confiança no contrato do detector

O achado ganha `confidence: 'high' | 'medium' | 'low'`. Regras de `REGEX_DB` podem declarar `confidence`; sem declaração, `'high'`.

Sobreposição: ordenar por confiança (decrescente) e depois por `index`, aceitando cada achado que não colide com um já aceito; ao final, reordenar por `index`. Com todos os achados em alta, o resultado é idêntico ao algoritmo atual, o que mantém a edição US e as regras numéricas BR inalteradas.

Alternativa descartada: desempatar por comprimento ("o mais longo vence"). Mudaria o comportamento das regras numéricas, que estão fora do escopo e sem testes.

### D9. Baixa confiança reaproveita `dismissed`

Ao terminar a detecção, `app.js` inicializa `dismissed` com os índices dos achados de baixa confiança. Todo o resto (destaques, contagens, `anonymizeAll`, restaurar) já respeita `dismissed`. Na seção de dispensados, o item de baixa confiança que o usuário não tocou recebe uma etiqueta de sugestão; para isso basta comparar `confidence === 'low'` com um segundo `Set` dos que o usuário dispensou manualmente.

`resetApp` e o reprocessamento refazem essa inicialização.

Alternativa descartada: um terceiro estado ("sugerido") com seção própria. Mais interface e mais estado para o mesmo efeito.

### D10. Achado cobre só o nome

`index`/`length` apontam para o nome; o rótulo fica fora. A substituição passa a ser a constante `[NOME OCULTADO]` ou `[EMPRESA OCULTADA]`, sem `replacement_fn`. Isso torna a propagação trivial (mesmo valor, mesma substituição) e é o formato que a pseudonimização por token vai precisar.

### D11. Léxico de prenomes

`js/data/prenomes-br.js` exporta um `Set` de prenomes normalizados (sem acento, maiúsculas), gerado a partir dos dados públicos de nomes do IBGE (Censo 2010), com 1.595 prenomes: a API só devolve os 20 primeiros por consulta, então a lista é a união dos rankings por estado, município e década, cortada em 2.000 ocorrências nacionais (tamanho aceito pelo usuário em 2026-11-15). O cabeçalho do arquivo registra fonte, data e critério de corte. O arquivo é versionado; não há download em runtime, e o CSP não muda.

### D12. Testes

`package.json` mínimo (`"type": "module"`, script `test` = `node --test`), sem dependências. `tests/fixtures/` contém contratos **sintéticos** em texto (locação, prestação de serviços, compra e venda), cada um com a lista esperada de pessoas e empresas. Documentos reais nunca entram no repositório.

Dois tipos de teste: unitários por âncora (um por cenário das specs) e de fixture (todas as pessoas e empresas esperadas encontradas; nenhum achado de nome ou empresa fora da lista com confiança alta ou média).

`"type": "module"` não afeta o navegador; `js/landing.js` é script clássico e não é importado em Node.

### D13. Remoções

Saem de `js/rules/br.js` as regras `nome_label` e `nome_caps`, com a lista de stopwords. Entra `empresa` em `CATEGORIES` e em `MANUAL_CATEGORIES`, com um tom novo em `css/app.css`.

### D14. Continuação na linha seguinte

A extração do pdf.js devolve cada linha visual do PDF como uma linha de texto, muitas vezes separada da seguinte por uma linha em branco (`\n\n`), e parágrafos justificados quebram nomes no meio. Por isso um nome em texto corrido que chega ao fim da linha continua nas palavras de nome do início da próxima linha de texto, tolerando uma linha em branco entre elas. Vale para todas as âncoras (para a frente e, na qualificação à direita, para trás) e para a propagação, cujo separador entre palavras passa a aceitar essa quebra.

Não há continuação quando uma das linhas é título `## `, quando a primeira linha contém só o nome (bloco de assinatura, nomes empilhados) ou quando a linha seguinte começa por papel, rótulo com `:`, marcador de lista ou tracejado. O limite de 7 palavras vale para o nome inteiro.

A continuação só acontece com indício de que o nome não terminou na linha (ver o requisito "Continuação exige indício de nome incompleto"). Sem essa condição, um nome completo no fim de uma linha absorvia o começo da linha seguinte: `FIADOR: Pedro Henrique D'Ávila Neto` seguido de `São Paulo, 10 de março` virava um nome só. O custo é que um nome quebrado em texto corrido, seguido de palavra em minúsculas e nunca escrito por inteiro em outro ponto, fica coberto só até o fim da linha.

Na âncora de assinatura, a linha só com o papel pode vir depois de uma linha em branco, como já acontece com o tracejado.

Quebra no meio de uma palavra não é tratada.

Alternativa descartada: corrigir a extração em `app.js` para reconstruir parágrafos. Mudaria o Markdown exibido e baixado, fora do escopo.

### D15. Assinatura sem tracejado exige prenome

A variante "linha de nome seguida de linha só com o papel" aceitava qualquer linha com forma de nome, e um título seguido de `CONTRATANTE` saía como nome de confiança alta. Sem tracejado antes, a primeira palavra precisa ser prenome do léxico. Com tracejado, a exigência não se aplica.

## Risks / Trade-offs

- [Formatos de preâmbulo não previstos nos fixtures sintéticos] → A âncora sem rótulo (léxico, 3+ palavras, média) funciona como rede; a lista de papéis é um array único, fácil de estender; cada formato novo encontrado vira fixture.
- [Nome que só aparece sem âncora e com duas palavras fica dispensado por padrão] → Fica visível na seção de dispensados com etiqueta de sugestão; documentado no README como limitação.
- [Prenome fora do léxico (raro ou estrangeiro) em sequência sem âncora não é detectado] → Âncoras não dependem do léxico; só o caso sem âncora é afetado.
- [Sufixo societário curto (`ME`, `SA`) gera empresa falsa em texto em CAPS] → Exigência de duas palavras antes do sufixo na mesma linha; cenário negativo nos testes.
- [A âncora de qualificação à direita captura palavra inicial que não é nome] → Descarte da primeira palavra quando não é prenome e a seguinte é; cenário nos testes.
- [Mudança visível para quem já usa: `Nome: Fulano` deixa de ser substituído inteiro] → É o comportamento desejado; registrado no README.
- [Medição feita só sobre contratos sintéticos escritos pelo próprio autor das regras] → Os números de precisão e cobertura valem como regressão, não como estimativa de campo; o usuário valida com contratos reais na tarefa de integração, sem versioná-los.

## Migration Plan

Site estático: a mudança entra no deploy seguinte, sem migração de dados. Reversão por `git revert`. A edição US não muda de comportamento, o que os testes de sobreposição com achados todos em alta fixam.

## Open Questions

(nenhuma)
