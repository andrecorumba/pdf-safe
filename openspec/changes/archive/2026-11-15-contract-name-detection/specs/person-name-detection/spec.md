# person-name-detection

## Purpose

Localiza nomes de pessoas físicas em documentos brasileiros, com foco em contratos, para que possam ser ocultados sem que títulos, termos definidos e frases comuns sejam confundidos com nomes.

## ADDED Requirements

### Requirement: Forma de um nome
O sistema SHALL reconhecer como candidato a nome apenas uma sequência de 2 a 7 palavras, cada uma com inicial maiúscula ou toda em maiúsculas, admitindo as partículas `de`, `da`, `do`, `dos`, `das`, `e`, `di`, `del`, `von`, `van` entre palavras, apóstrofo e hífen dentro de palavra e os sufixos `Filho`, `Neto`, `Júnior`, `Jr.` e `Sobrinho`. A comparação de maiúsculas SHALL ser sensível a caixa.

#### Scenario: Nome com partícula, apóstrofo e sufixo
- **WHEN** o texto contém `FIADOR: Pedro Henrique D'Ávila Neto`
- **THEN** o achado de nome tem o valor `Pedro Henrique D'Ávila Neto`

#### Scenario: Palavras em minúsculas não formam nome
- **WHEN** o texto contém `Nome: a definir pelas partes`
- **THEN** nenhum achado de nome é reportado

### Requirement: Nome continuado na linha seguinte
Um nome em texto corrido que chega ao fim da linha SHALL continuar nas palavras de nome que iniciam a próxima linha de texto, com no máximo uma linha em branco entre elas. A continuação SHALL NOT ocorrer quando uma das duas linhas é título (`## `), quando a primeira linha contém apenas o nome, ou quando a linha seguinte começa por palavra de papel, rótulo com `:`, marcador de lista ou tracejado. A regra SHALL valer para todas as âncoras e para a propagação.

#### Scenario: Nome quebrado no preâmbulo
- **WHEN** uma linha termina em `LOCADOR: JOÃO CARLOS DE ALMEIDA` e a linha seguinte começa com `PRADO, brasileiro, casado`
- **THEN** há um único achado de nome cobrindo `JOÃO CARLOS DE ALMEIDA` e `PRADO`, e a anonimização não deixa nenhuma parte do nome no resultado

#### Scenario: Quebra com linha em branco entre as linhas
- **WHEN** uma linha termina em `de outro lado Maria Fernanda`, a seguinte está em branco e a próxima começa com `Souza Lima, brasileira, solteira`
- **THEN** há um único achado de nome cobrindo as quatro palavras

#### Scenario: Ocorrência propagada quebrada entre linhas
- **WHEN** o documento contém `LOCATÁRIA: Maria Fernanda Souza Lima` e, em outro parágrafo, uma linha termina em `a locatária MARIA FERNANDA` e a seguinte começa com `SOUZA LIMA reconhece`
- **THEN** a segunda ocorrência é reportada como um único achado de nome

#### Scenario: Título não se junta ao rótulo da linha seguinte
- **WHEN** uma linha contém `CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL` e a linha seguinte começa com `LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO`
- **THEN** nenhum achado contém texto das duas linhas

#### Scenario: Nome de assinatura não absorve a linha seguinte
- **WHEN** uma linha contém apenas `Maria Fernanda Souza Lima` e a linha seguinte contém apenas `Locatária`, ou apenas outro nome
- **THEN** o achado de nome cobre somente `Maria Fernanda Souza Lima`

### Requirement: Continuação exige indício de nome incompleto
A continuação na linha seguinte SHALL ocorrer somente quando há indício de que o nome não terminou na primeira linha: a primeira parte termina em partícula; a primeira parte tem menos de duas palavras de nome; a continuação é seguida de vírgula e termo de qualificação ou de documento; a continuação termina a linha ou é seguida de `.`, `;` ou `)`; ou o nome completo resultante já foi confirmado em outro ponto do documento. Sem nenhum desses indícios, o nome SHALL terminar na primeira linha.

#### Scenario: Cidade e data após o nome não são absorvidas
- **WHEN** uma linha contém `FIADOR: Pedro Henrique D'Ávila Neto` e a próxima linha de texto começa com `São Paulo, 10 de março de 2025.`
- **THEN** o achado de nome tem o valor `Pedro Henrique D'Ávila Neto`, sem `São Paulo`

#### Scenario: Início de frase após o nome não é absorvido
- **WHEN** uma linha contém `Fiador: Pedro Silva Santos` e a próxima linha de texto começa com `Responde solidariamente pelas obrigações`
- **THEN** o achado de nome tem o valor `Pedro Silva Santos`

#### Scenario: Partícula pendente no fim da linha
- **WHEN** uma linha termina em `VENDEDOR: ANTÔNIO CARLOS FERREIRA DE` e a seguinte começa com `MELO vende o imóvel`
- **THEN** há um único achado de nome cobrindo `ANTÔNIO CARLOS FERREIRA DE` e `MELO`

#### Scenario: Nome que termina a frase na linha seguinte
- **WHEN** uma linha termina em `representada pelo Sr. Ricardo Nogueira` e a seguinte começa com `Bastos.`
- **THEN** há um único achado de nome cobrindo `Ricardo Nogueira` e `Bastos`

### Requirement: Nome após rótulo de papel
O sistema SHALL reportar com confiança alta o nome que segue um rótulo de papel terminado em `:`. Os rótulos SHALL incluir os papéis contratuais (como Locador, Locatário, Contratante, Contratado, Comprador, Vendedor, Cedente, Cessionário, Fiador, Avalista, Credor, Devedor, Procurador, Testemunha), em qualquer caixa, gênero e número, além de `Nome` e suas formas compostas (`Nome completo`, `Nome da mãe`, `Nome do pai`, `Nome social`).

#### Scenario: Papel em CAPS com dois-pontos
- **WHEN** o texto contém `LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO, brasileiro, casado`
- **THEN** há um achado de nome com valor `JOÃO CARLOS DE ALMEIDA PRADO` e confiança alta

#### Scenario: Rótulo composto
- **WHEN** o texto contém `Nome da mãe: Maria José da Conceição`
- **THEN** o achado de nome tem o valor `Maria José da Conceição`, e `Nome da mãe` não faz parte de nenhum achado

### Requirement: Papel sem dois-pontos é termo definido
O sistema SHALL NOT tratar uma palavra de papel como rótulo de nome quando ela não é seguida de `:`.

#### Scenario: Termo definido no corpo da cláusula
- **WHEN** o texto contém `O Contratante declara que o imóvel será utilizado para fins residenciais.`
- **THEN** nenhum achado de nome é reportado

#### Scenario: Palavras capitalizadas após o papel
- **WHEN** o texto contém `O Contratado Deverá Entregar o imóvel em perfeitas condições.`
- **THEN** nenhum achado de nome é reportado

### Requirement: Nome seguido de qualificação
O sistema SHALL reportar com confiança alta o nome imediatamente seguido de vírgula e de um termo de qualificação civil: nacionalidade (`brasileiro(a)`), estado civil, `maior`, `portador(a)`, `inscrito(a)`, `CPF` ou `RG`.

#### Scenario: Qualificação sem rótulo
- **WHEN** o texto contém `de outro lado Maria Fernanda Souza Lima, brasileira, solteira, inscrita no CPF`
- **THEN** há um achado de nome com valor `Maria Fernanda Souza Lima` e confiança alta

#### Scenario: Palavra inicial que não é prenome
- **WHEN** o texto contém `Comparece Maria Fernanda Souza Lima, brasileira`
- **THEN** o achado de nome tem o valor `Maria Fernanda Souza Lima`, sem `Comparece`

### Requirement: Nome após tratamento ou representação
O sistema SHALL reportar com confiança alta o nome que segue um pronome de tratamento (`Sr.`, `Sra.`, `Srta.`, `Dr.`, `Dra.`, `Prof.`, `Profa.`) ou a expressão `representado(a) por`.

#### Scenario: Representante de pessoa jurídica
- **WHEN** o texto contém `neste ato representada por seu sócio administrador, Sr. Ricardo Nogueira Bastos.`
- **THEN** há um achado de nome com valor `Ricardo Nogueira Bastos` e confiança alta

### Requirement: Nome em bloco de assinatura
O sistema SHALL reportar com confiança alta uma linha composta apenas por um nome quando ela vem logo após uma linha de tracejado de assinatura. Sem tracejado antes, a linha seguida de outra composta apenas por um papel SHALL ser reportada somente se sua primeira palavra for um prenome do léxico. O marcador de título `## ` no início da linha SHALL ser ignorado nessa avaliação.

#### Scenario: Nome abaixo do tracejado
- **WHEN** uma linha contém `_______________________________` e a linha seguinte contém `Maria Fernanda Souza Lima`
- **THEN** há um achado de nome com valor `Maria Fernanda Souza Lima` e confiança alta

#### Scenario: Linha de assinatura convertida em título
- **WHEN** a linha após o tracejado é `## JOÃO CARLOS DE ALMEIDA PRADO` e a linha seguinte é `Locador`
- **THEN** há um achado de nome com valor `JOÃO CARLOS DE ALMEIDA PRADO`

#### Scenario: Título seguido de linha só com o papel
- **WHEN** uma linha contém `CONTRATO DE EMPREITADA`, sem tracejado antes, e a linha seguinte contém apenas `CONTRATANTE`
- **THEN** nenhum achado de nome é reportado

#### Scenario: Nome sem tracejado seguido do papel
- **WHEN** uma linha contém apenas `Ricardo Nogueira Bastos`, sem tracejado antes, e a linha seguinte contém apenas `Contratado`
- **THEN** há um achado de nome com valor `Ricardo Nogueira Bastos` e confiança alta

### Requirement: Nome próximo a documento ou em lista de testemunhas
O sistema SHALL reportar com confiança média o nome que precede, na mesma linha, um CPF ou RG, e o nome em item numerado que segue uma linha `TESTEMUNHAS`.

#### Scenario: Testemunha com CPF
- **WHEN** o texto contém `1. Ana Paula Ribeiro Costa – CPF 390.533.447-05`
- **THEN** há um achado de nome com valor `Ana Paula Ribeiro Costa` e confiança média ou superior

#### Scenario: Testemunha sem documento
- **WHEN** uma linha contém `TESTEMUNHAS:` e uma linha seguinte contém `2. CARLOS EDUARDO MENDES`
- **THEN** há um achado de nome com valor `CARLOS EDUARDO MENDES`

### Requirement: Propagação de nomes confirmados
O sistema SHALL reportar toda outra ocorrência, no mesmo documento, de um nome detectado com confiança alta ou média, comparando sem distinção de caixa e de acentos e exigindo o nome completo. A ocorrência propagada SHALL herdar a confiança do achado de origem.

#### Scenario: Mesmo nome em outra caixa
- **WHEN** o documento contém `LOCATÁRIA: Maria Fernanda Souza Lima` e, em outro ponto sem âncora, `MARIA FERNANDA SOUZA LIMA`
- **THEN** as duas ocorrências são reportadas como nome, com a mesma confiança

#### Scenario: Nome parcial não é propagado
- **WHEN** o documento contém `LOCADOR: João Carlos de Almeida Prado` e, em outro ponto, apenas `João`
- **THEN** a ocorrência isolada `João` não é reportada por propagação

### Requirement: Sequência sem âncora depende de prenome conhecido
Uma sequência com forma de nome e sem âncora SHALL ser reportada somente se a primeira palavra for um prenome do léxico: com confiança média quando tiver três ou mais palavras de nome, e baixa quando tiver duas. Sequências cuja primeira palavra não é prenome conhecido SHALL NOT ser reportadas.

#### Scenario: Título de cláusula em CAPS
- **WHEN** o texto contém a linha `CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL` ou `DAS DISPOSIÇÕES GERAIS`
- **THEN** nenhum achado de nome é reportado

#### Scenario: Nome em texto corrido
- **WHEN** o texto contém `João da Silva Santos compareceu à audiência`
- **THEN** há um achado de nome com valor `João da Silva Santos` e confiança média

#### Scenario: Duas palavras começando por prenome
- **WHEN** o texto contém `na cidade de Vitória da Conquista`
- **THEN** o eventual achado de nome sobre `Vitória da Conquista` tem confiança baixa

### Requirement: Achado cobre apenas o nome
O achado de nome SHALL cobrir exatamente o texto do nome, sem rótulo, pronome de tratamento ou qualificação, e sua substituição SHALL ser `[NOME OCULTADO]`.

#### Scenario: Rótulo preservado na anonimização
- **WHEN** o usuário anonimiza um documento que contém `LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO, brasileiro`
- **THEN** o resultado contém `LOCADOR: [NOME OCULTADO], brasileiro`
