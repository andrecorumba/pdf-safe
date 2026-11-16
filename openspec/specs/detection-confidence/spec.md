# detection-confidence Specification

## Purpose

Atribui a cada achado um nível de confiança, para que detecções incertas sejam oferecidas como sugestão em vez de serem aplicadas ou descartadas em silêncio.

## Requirements

### Requirement: Todo achado tem confiança
Cada achado SHALL ter um nível de confiança: alta, média ou baixa. Um achado produzido por regra que não declara confiança SHALL ter confiança alta.

#### Scenario: Regra existente sem confiança declarada
- **WHEN** a edição US detecta um SSN com as regras atuais
- **THEN** o achado tem confiança alta

### Requirement: Sobreposição resolvida por confiança
Quando dois achados se sobrepõem, o sistema SHALL manter o de maior confiança. Entre achados de mesma confiança, SHALL manter o que começa primeiro no texto.

#### Scenario: Confianças diferentes
- **WHEN** um achado de confiança alta e um de confiança baixa cobrem trechos que se sobrepõem
- **THEN** só o de confiança alta é reportado, mesmo que o de baixa comece antes

#### Scenario: Mesma confiança
- **WHEN** dois achados de confiança alta se sobrepõem
- **THEN** só o que começa primeiro é reportado

### Requirement: Baixa confiança começa dispensada
Um achado de confiança baixa SHALL iniciar no estado dispensado: fora dos destaques, das contagens e da anonimização, e listado na seção de dispensados com indicação de que é sugestão de baixa confiança. O usuário SHALL poder restaurá-lo como qualquer achado dispensado. Achados de confiança alta e média SHALL iniciar ativos.

#### Scenario: Sugestão não é aplicada por padrão
- **WHEN** um documento produz um achado de confiança baixa e o usuário anonimiza sem alterar nada
- **THEN** o trecho desse achado permanece inalterado no resultado

#### Scenario: Usuário aceita a sugestão
- **WHEN** o usuário restaura um achado de confiança baixa e anonimiza
- **THEN** o trecho é substituído no resultado

#### Scenario: Sugestão identificada na lista
- **WHEN** a seção de dispensados é aberta em um documento com achados de confiança baixa
- **THEN** esses achados aparecem marcados como sugestão de baixa confiança, distintos dos que o usuário dispensou
