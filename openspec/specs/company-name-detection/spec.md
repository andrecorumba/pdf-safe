# company-name-detection Specification

## Purpose

Localiza razões sociais em documentos brasileiros e as trata como categoria própria, para que o usuário possa ocultar empresas independentemente de nomes de pessoas.

## Requirements

### Requirement: Categoria Empresa
A edição BR SHALL oferecer a categoria `Empresa`, distinta de `Nomes`, com filtro, contagem e cor próprios na revisão, disponível também na seleção manual. A substituição de um achado dessa categoria SHALL ser `[EMPRESA OCULTADA]`.

#### Scenario: Filtro independente
- **WHEN** um documento tem achados de nome e de empresa e o usuário desativa o filtro `Empresa`
- **THEN** a anonimização oculta os nomes de pessoas e mantém as razões sociais

#### Scenario: Marcação manual
- **WHEN** o usuário seleciona um trecho e escolhe a categoria `Empresa`
- **THEN** o trecho entra na lista de achados na categoria `Empresa`

### Requirement: Razão social por sufixo societário
O sistema SHALL reportar com confiança alta, na categoria Empresa, a sequência de palavras capitalizadas ou em maiúsculas, na mesma linha, que termina em sufixo societário (`LTDA`, `S.A.`, `S/A`, `EIRELI`, `ME`, `EPP`, `MEI`, `S/S`, `SLU`), admitindo conectores em minúsculas, `&` e dígitos no meio.

#### Scenario: Razão social em CAPS
- **WHEN** o texto contém `CONTRATADA: ALFA SERVIÇOS DE ENGENHARIA LTDA, pessoa jurídica de direito privado`
- **THEN** há um achado de empresa com valor `ALFA SERVIÇOS DE ENGENHARIA LTDA`, e nenhum achado de nome sobre esse trecho

#### Scenario: Sufixo isolado não é empresa
- **WHEN** o texto contém `conforme o regime ME previsto em lei`
- **THEN** nenhum achado de empresa é reportado

### Requirement: Razão social por qualificação de pessoa jurídica
O sistema SHALL reportar com confiança alta, na categoria Empresa, a sequência com forma de nome imediatamente seguida de `, pessoa jurídica` ou de `, inscrita no CNPJ`, mesmo sem sufixo societário.

#### Scenario: Empresa sem sufixo
- **WHEN** o texto contém `CONTRATANTE: Instituto Aurora de Pesquisa, pessoa jurídica de direito privado`
- **THEN** há um achado de empresa com valor `Instituto Aurora de Pesquisa`, e nenhum achado de nome sobre esse trecho

### Requirement: Propagação de razões sociais confirmadas
O sistema SHALL reportar, na categoria Empresa, toda outra ocorrência no documento de uma razão social detectada, comparando sem distinção de caixa e de acentos.

#### Scenario: Razão social repetida na assinatura
- **WHEN** o documento contém `ALFA SERVIÇOS DE ENGENHARIA LTDA` no preâmbulo e `Alfa Serviços de Engenharia Ltda` no bloco de assinatura
- **THEN** as duas ocorrências são reportadas na categoria Empresa
