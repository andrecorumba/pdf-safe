# Proposal: contract-name-detection

## Why

Em contratos, a detecção de nomes da edição BR erra nos dois sentidos: num contrato de locação sintético, 6 de 10 achados de nome são falsos positivos (títulos de cláusula em CAPS, frases como "Contratante declara que") e 4 das 6 pessoas passam sem detecção. O usuário revisa principalmente contratos e gasta o tempo dispensando falsos positivos, enquanto nomes reais vazam.

As causas são estruturais, não de calibragem: `nome_label` usa a flag `i`, que anula a exigência de inicial maiúscula; `nome_caps` aceita qualquer sequência de palavras em CAPS e depende de uma lista de stopwords que não escala; e todo achado é binário, sem noção de confiança.

## What Changes

- Substituir as regras `nome_label` e `nome_caps` da edição BR por detecção de nomes baseada em **âncoras de contrato**: papel seguido de `:` (`LOCADOR:`, `CONTRATANTE:`), qualificação à direita (`, brasileiro(a)`, `, portador(a)`, `, inscrito(a) no CPF`), pronome de tratamento e "representado(a) por", bloco de assinatura, lista de testemunhas e vizinhança de CPF/RG.
- Tratar palavra de papel **sem** `:` ("O Locador entregará...") como termo definido do contrato, nunca como rótulo de nome.
- **Propagar** cada nome confirmado por âncora para todas as suas repetições no documento, em CAPS ou capitalizado.
- Introduzir **confiança** (alta, média, baixa) em todo achado. Achados de baixa confiança aparecem já dispensados, e o usuário os restaura se quiser.
- Usar um **léxico de prenomes** (IBGE) para sequências sem âncora: sem prenome conhecido na primeira posição, a sequência não é reportada.
- Criar a categoria **Empresa**, separada de Nome, para razão social (ancorada em sufixo societário e em `, pessoa jurídica`), com filtro e substituição próprios (`[EMPRESA OCULTADA]`).
- O achado de nome passa a cobrir **só o nome**, sem o rótulo. Hoje `Nome: Fulano` é substituído inteiro.
- Criar a infraestrutura de testes (`node --test`) com contratos sintéticos como fixtures.

Fora do escopo desta change:

- Regras numéricas (CPF, CEP, telefone, datas, conta, IE) e seus falsos positivos e variações.
- Regras de nome da edição US (que têm o mesmo defeito da flag `i`).
- Detecção de títulos por layout do pdf.js, e NER em navegador.
- Variantes parciais de um nome (só prenome, ou prenome + último sobrenome).

## Capabilities

### New Capabilities

- `person-name-detection`: detecção de nomes de pessoas físicas em documentos BR por âncoras contratuais, propagação no documento e léxico de prenomes.
- `company-name-detection`: detecção de razão social como categoria própria, separada de nomes de pessoas.
- `detection-confidence`: nível de confiança em cada achado e seu efeito na resolução de sobreposição e no estado inicial do achado na revisão.

### Modified Capabilities

(nenhuma — não há specs em `openspec/specs/`)

## Impact

- **Código**: `js/rules/br.js` (saem `nome_label` e `nome_caps`; entra a categoria `empresa`), `js/detector.js` (confiança, detectores além de regex, sobreposição), `js/app.js` (estado inicial dos achados de baixa confiança), `js/i18n/pt-BR.js`, `js/i18n/en-US.js`, `css/app.css` (tom da nova categoria). Módulos novos para nomes, empresas e léxico.
- **Comportamento**: na edição BR mudam os achados das categorias Nome e Empresa e a ordem de sobreposição quando há confianças diferentes. Na edição US nada muda: todas as regras atuais ficam com confiança alta, e a sobreposição se comporta como hoje.
- **Dependência de dados**: lista de prenomes do IBGE, versionada no repositório e servida como arquivo estático (~30 KB). Nenhuma chamada de rede em tempo de execução; CSP inalterado.
- **Ferramentas de desenvolvimento**: `package.json` mínimo e diretório `tests/`. Sem build step e sem dependências.
- **Changes planejadas**: adianta a infraestrutura de testes da `detection-tests`, que fica com as regras numéricas e a edição US. A `reversible-pseudonymization` se beneficia do achado que cobre só o nome.
