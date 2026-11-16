// One test per scenario of specs/person-name-detection and
// specs/company-name-detection, plus the invariants the design relies on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSensitiveData } from '../js/detector.js';
import { detectNames } from '../js/names/br.js';
import { PRENOMES } from '../js/data/prenomes-br.js';
import { normalize, isNameLine, matchNameAt } from '../js/names/shape.js';

const run = (text) => detectSensitiveData(text, [], [detectNames]);
const people = (text) => run(text).filter((f) => f.cat === 'nome');
const companies = (text) => run(text).filter((f) => f.cat === 'empresa');
const values = (list) => list.map((f) => f.value);

// Apply replacements the way the app does (end to start).
function anonymize(text) {
  let out = text;
  for (const f of [...run(text)].sort((a, b) => b.index - a.index)) {
    out = out.slice(0, f.index) + f.replacement + out.slice(f.index + f.length);
  }
  return out;
}

// ── Forma de um nome ──

test('shape: name with particle, apostrophe and suffix', () => {
  const found = people("FIADOR: Pedro Henrique D'Ávila Neto");
  assert.deepEqual(values(found), ["Pedro Henrique D'Ávila Neto"]);
});

test('shape: lowercase words do not form a name', () => {
  assert.deepEqual(people('Nome: a definir pelas partes'), []);
});

test('shape: a name does not cross a line break', () => {
  const text = 'CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL\nLOCADOR: JOÃO CARLOS DE ALMEIDA PRADO';
  const found = run(text);
  assert.ok(found.every((f) => !f.value.includes('\n')));
  assert.deepEqual(values(people(text)), ['JOÃO CARLOS DE ALMEIDA PRADO']);
});

test('shape: case-sensitive grammar and word limits', () => {
  assert.equal(isNameLine('Maria Fernanda'), true);
  assert.equal(isNameLine('maria fernanda'), false);
  assert.equal(isNameLine('Maria'), false);
  assert.equal(matchNameAt('A B C D E F G H', 0), null);
  assert.equal(matchNameAt('Ana Bia Cris Dani Edna Fabi Gabi Heloisa Iara', 0), 'Ana Bia Cris Dani Edna Fabi Gabi');
});

test('shape: classes do not include the multiplication sign', () => {
  assert.equal(isNameLine('Maria × Silva'), false);
});

test('shape: Hyphen and mixed words', () => {
  assert.deepEqual(values(people('LOCADOR: Ana Clara Silva-Santos, brasileira')), ['Ana Clara Silva-Santos']);
});

// ── Nome após rótulo de papel ──

test('label: role in caps with colon', () => {
  const [f] = people('LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO, brasileiro, casado');
  assert.equal(f.value, 'JOÃO CARLOS DE ALMEIDA PRADO');
  assert.equal(f.confidence, 'high');
});

test('label: compound Nome da mãe, label stays out of the finding', () => {
  const found = people('Nome da mãe: Maria José da Conceição');
  assert.deepEqual(values(found), ['Maria José da Conceição']);
  assert.ok(!found.some((f) => f.value.includes('Nome')));
});

test('label: Nome completo / Nome do pai / Nome social', () => {
  assert.deepEqual(values(people('Nome completo: Rafael Augusto Pereira')), ['Rafael Augusto Pereira']);
  assert.deepEqual(values(people('Nome do pai: Antonio Carlos Pereira')), ['Antonio Carlos Pereira']);
  assert.deepEqual(values(people('Nome social: Luiza Helena Prado')), ['Luiza Helena Prado']);
});

test('label: gender and number variants, any case', () => {
  assert.deepEqual(values(people('locatária: Maria Fernanda Souza Lima')), ['Maria Fernanda Souza Lima']);
  assert.deepEqual(values(people('Testemunha: Carlos Eduardo Mendes')), ['Carlos Eduardo Mendes']);
});

// ── Papel sem dois-pontos ──

test('defined term: role without colon is not a label', () => {
  assert.deepEqual(run('O Contratante declara que o imóvel será utilizado para fins residenciais.'), []);
});

test('defined term: capitalized words after the role', () => {
  assert.deepEqual(run('O Contratado Deverá Entregar o imóvel em perfeitas condições.'), []);
});

// ── Qualificação ──

test('qualification: name followed by civil qualification', () => {
  const found = people('de outro lado Maria Fernanda Souza Lima, brasileira, solteira, inscrita no CPF');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Maria Fernanda Souza Lima');
  assert.equal(found[0].confidence, 'high');
});

test('qualification: leading word that is not a first name is dropped', () => {
  const found = people('Comparece Maria Fernanda Souza Lima, brasileira');
  assert.deepEqual(values(found), ['Maria Fernanda Souza Lima']);
});

test('qualification: several qualifiers (portador, maior, estado civil)', () => {
  assert.deepEqual(values(people('Pedro Alves Barros, portador do RG')), ['Pedro Alves Barros']);
  assert.deepEqual(values(people('Paulo Roberto Dias, maior e capaz')), ['Paulo Roberto Dias']);
  assert.deepEqual(values(people('Lucas Gabriel Rocha, casado')), ['Lucas Gabriel Rocha']);
});

// ── Tratamento / representação ──

test('treatment: represented by a form of address', () => {
  const found = people('neste ato representada por seu sócio administrador, Sr. Ricardo Nogueira Bastos.');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Ricardo Nogueira Bastos');
  assert.equal(found[0].confidence, 'high');
});

test('treatment: representado por, direct name', () => {
  assert.deepEqual(values(people('neste ato representado por Paulo Cesar Nunes')), ['Paulo Cesar Nunes']);
});

test('treatment: Dra. and Prof.', () => {
  assert.deepEqual(values(people('A Dra. Beatriz Helena Moraes Tavares assinou.')), ['Beatriz Helena Moraes Tavares']);
  assert.deepEqual(values(people('Profa. Clara Maria Duarte presidiu.')), ['Clara Maria Duarte']);
});

// ── Assinatura ──

test('signature: name below the dashes', () => {
  const found = people('_______________________________\nMaria Fernanda Souza Lima');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Maria Fernanda Souza Lima');
  assert.equal(found[0].confidence, 'high');
});

test('signature: line converted to a heading is still found', () => {
  const found = people('_______________________________\n## JOÃO CARLOS DE ALMEIDA PRADO\nLocador');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'JOÃO CARLOS DE ALMEIDA PRADO');
  const text = '_______________________________\n## JOÃO CARLOS DE ALMEIDA PRADO\nLocador';
  assert.equal(found[0].index, text.indexOf('JOÃO'), 'finding excludes the ## marker');
});

test('signature: name line followed by a role-only line', () => {
  const found = people('Roberto Augusto Fonseca Vieira\nVendedor');
  assert.deepEqual(values(found), ['Roberto Augusto Fonseca Vieira']);
  assert.equal(found[0].confidence, 'high');
});

test('signature: page separator is not a dashed signature line', () => {
  assert.ok(people('---\nMaria Fernanda').every((f) => f.confidence === 'low'));
});

// ── CPF/RG e testemunhas ──

test('document: witness with CPF', () => {
  const found = people('1. Ana Paula Ribeiro Costa – CPF 390.533.447-05');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Ana Paula Ribeiro Costa');
  assert.ok(['medium', 'high'].includes(found[0].confidence));
});

test('witness list: item without document', () => {
  const found = people('TESTEMUNHAS:\n1. Ana Paula Ribeiro Costa\n2. CARLOS EDUARDO MENDES');
  assert.ok(values(found).includes('CARLOS EDUARDO MENDES'));
  assert.equal(found.find((f) => f.value === 'CARLOS EDUARDO MENDES').confidence, 'medium');
});

test('witness list: surname-only first words not required to be first names', () => {
  const found = people('TESTEMUNHAS\n1) Xavier Quintanilha Zorzi');
  assert.deepEqual(values(found), ['Xavier Quintanilha Zorzi']);
});

// ── Propagação ──

test('propagation: same name in another case, same confidence', () => {
  const text = 'LOCATÁRIA: Maria Fernanda Souza Lima, brasileira.\n\nXyz abc MARIA FERNANDA SOUZA LIMA assinou.';
  const found = people(text);
  assert.equal(found.length, 2);
  assert.deepEqual(found.map((f) => f.confidence), ['high', 'high']);
  assert.equal(found[1].value, 'MARIA FERNANDA SOUZA LIMA');
});

test('propagation: no accents and different case still match', () => {
  const text = 'LOCADOR: João Carlos de Almeida Prado\njoao carlos de almeida prado';
  // lowercase text has no name shape, so it is not an occurrence candidate by shape,
  // but propagation compares normalized text and finds it.
  assert.equal(people(text).length, 2);
});

test('propagation: partial name is not propagated', () => {
  const found = people('LOCADOR: João Carlos de Almeida Prado, brasileiro.\n\nJoão compareceu.');
  assert.deepEqual(values(found), ['João Carlos de Almeida Prado']);
});

test('propagation: word boundary on both sides', () => {
  const found = people('LOCADOR: Ana Maria Souza, brasileira.\nAna Maria Souzana e Joana Ana Maria Souza');
  assert.equal(found.filter((f) => f.value === 'Ana Maria Souza').length, 2);
  assert.ok(!found.some((f) => f.value.endsWith('Souzana')));
});

test('propagation: low confidence is not propagated', () => {
  const text = 'na cidade de Vitória da Conquista\noutra vez Vitória da Conquista';
  assert.ok(people(text).every((f) => f.confidence === 'low'));
});

test('propagation: normalization keeps indices valid for NFC text', () => {
  const sample = "João Carlos D'Ávila Ñandú ÇÃO ßeta œ";
  assert.equal(sample.normalize('NFC'), sample);
  assert.equal(normalize(sample).length, sample.length);
  const text = "LOCADOR: João Carlos D'Ávila\nlinha ß œ\nJOÃO CARLOS D'ÁVILA";
  const found = people(text);
  assert.equal(found.length, 2);
  for (const f of found) assert.equal(text.substr(f.index, f.length), f.value);
});

// ── Sem âncora ──

test('lexicon: clause titles in caps are not names', () => {
  assert.deepEqual(run('CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL'), []);
  assert.deepEqual(run('DAS DISPOSIÇÕES GERAIS'), []);
  assert.deepEqual(run('## CLÁUSULA TERCEIRA\n## DA GARANTIA'), []);
});

test('lexicon: three words starting with a first name is medium', () => {
  const found = people('João da Silva Santos compareceu à audiência');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'João da Silva Santos');
  assert.equal(found[0].confidence, 'medium');
});

test('lexicon: two words starting with a first name is low', () => {
  const found = people('na cidade de Vitória da Conquista');
  assert.ok(found.every((f) => f.confidence === 'low'));
});

test('lexicon: first word not a first name is not reported', () => {
  assert.deepEqual(run('Quintanilha Zorzi Xavier compareceu'), []);
});

test('lexicon: control first names are present', () => {
  for (const n of ['MARIA', 'JOAO', 'ANA', 'RICARDO']) assert.ok(PRENOMES.has(n), n);
});

// ── Só o nome ──

test('replacement: label is preserved', () => {
  assert.equal(
    anonymize('LOCADOR: JOÃO CARLOS DE ALMEIDA PRADO, brasileiro'),
    'LOCADOR: [NOME OCULTADO], brasileiro');
});

// ── Empresas ──

test('company: razão social in caps with suffix', () => {
  const text = 'CONTRATADA: ALFA SERVIÇOS DE ENGENHARIA LTDA, pessoa jurídica de direito privado';
  assert.deepEqual(values(companies(text)), ['ALFA SERVIÇOS DE ENGENHARIA LTDA']);
  assert.equal(companies(text)[0].confidence, 'high');
  assert.equal(companies(text)[0].replacement, '[EMPRESA OCULTADA]');
  assert.deepEqual(people(text), []);
});

test('company: suffix alone is not a company', () => {
  assert.deepEqual(companies('conforme o regime ME previsto em lei'), []);
  assert.deepEqual(companies('Eventual regime ME ou EPP não altera'), []);
});

test('company: legal-entity qualification without suffix', () => {
  const text = 'CONTRATANTE: Instituto Aurora de Pesquisa, pessoa jurídica de direito privado';
  assert.deepEqual(values(companies(text)), ['Instituto Aurora de Pesquisa']);
  assert.deepEqual(people(text), []);
});

test('company: inscrita no CNPJ without suffix', () => {
  const text = 'O Instituto Aurora de Pesquisa, inscrito no CNPJ sob o nº 11.222.333/0001-30';
  assert.deepEqual(values(companies(text)), ['Instituto Aurora de Pesquisa']);
});

test('company: unanchored suffix without role words', () => {
  assert.deepEqual(values(companies('Contratante Alfa Serviços Ltda recebeu o valor')), ['Alfa Serviços Ltda']);
  assert.deepEqual(values(companies('pagamento à Beta Tech & Co LTDA hoje')), ['Beta Tech & Co LTDA']);
});

test('company: S.A. keeps its final dot', () => {
  assert.deepEqual(values(companies('INTERVENIENTE: Construtora Horizonte Azul S.A., inscrita')), ['Construtora Horizonte Azul S.A.']);
});

test('company: propagation to the signature block', () => {
  const text = 'CONTRATADA: ALFA SERVIÇOS DE ENGENHARIA LTDA, pessoa jurídica\n\n_____\nAlfa Serviços de Engenharia Ltda\nContratada';
  const found = companies(text);
  assert.deepEqual(values(found), ['ALFA SERVIÇOS DE ENGENHARIA LTDA', 'Alfa Serviços de Engenharia Ltda']);
  assert.deepEqual(people(text), []);
});

test('company: value confirmed as company is a company everywhere', () => {
  const text = 'CONTRATANTE: Instituto Aurora de Pesquisa, pessoa jurídica\n\n_____\nInstituto Aurora de Pesquisa\nContratante';
  assert.equal(companies(text).length, 2);
  assert.deepEqual(people(text), []);
});

// ── CPF/RG proximity needs a real number ──

test('document: table header with bare CPF/RG labels is not an anchor', () => {
  assert.deepEqual(people('NOME COMPLETO CPF RG'), []);
  assert.deepEqual(people('NOME COMPLETO CPF'), []);
});

test('document: label with number, nº, colon and sob o nº', () => {
  assert.deepEqual(values(people('Ana Paula Ribeiro Costa CPF nº 390.533.447-05')), ['Ana Paula Ribeiro Costa']);
  assert.deepEqual(values(people('Ana Paula Ribeiro Costa, CPF: 39053344705')), ['Ana Paula Ribeiro Costa']);
  assert.deepEqual(values(people('Ana Paula Ribeiro Costa – RG 12.345.678-9')), ['Ana Paula Ribeiro Costa']);
});

test('document: formatted CPF with no label anchors the name before it', () => {
  assert.deepEqual(values(people('Ana Paula Ribeiro Costa 390.533.447-05')), ['Ana Paula Ribeiro Costa']);
});

test('document: label words never end up inside a name', () => {
  for (const f of people('NOME COMPLETO CPF RG\nLOCADOR: Maria Fernanda CPF')) {
    assert.ok(!/\b(?:CPF|RG)\b/.test(f.value), f.value);
  }
});

// ── Continuação na linha seguinte (D14) ──

const NAME_AT = (text, f) => text.slice(f.index, f.index + f.length);

test('continuation: name broken in the preamble, nothing left after anonymizing', () => {
  const text = 'LOCADOR: JOÃO CARLOS DE ALMEIDA\nPRADO, brasileiro, casado';
  const found = people(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'JOÃO CARLOS DE ALMEIDA\nPRADO');
  assert.equal(anonymize(text), 'LOCADOR: [NOME OCULTADO], brasileiro, casado');
});

test('continuation: one blank line between the lines', () => {
  const text = 'de outro lado Maria Fernanda\n\nSouza Lima, brasileira, solteira';
  const found = people(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Maria Fernanda\n\nSouza Lima');
  assert.equal(anonymize(text), 'de outro lado [NOME OCULTADO], brasileira, solteira');
});

test('continuation: more than one blank line does not join', () => {
  const found = people('LOCADOR: João Carlos\n\n\nPRADO, brasileiro');
  assert.deepEqual(values(found), ['João Carlos']);
});

test('continuation: propagated occurrence broken across lines', () => {
  const text = 'LOCATÁRIA: Maria Fernanda Souza Lima, brasileira.\n\nOutro texto.\n\na locatária MARIA FERNANDA\nSOUZA LIMA reconhece o imóvel.';
  const found = people(text);
  const broken = found.filter((f) => f.value.includes('\n'));
  assert.equal(broken.length, 1);
  assert.equal(broken[0].value, 'MARIA FERNANDA\nSOUZA LIMA');
  assert.equal(broken[0].confidence, 'high');
  assert.ok(!anonymize(text).includes('SOUZA'));
});

test('continuation: heading does not join the label on the next line', () => {
  const text = 'CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL\nLOCADOR: JOÃO CARLOS DE ALMEIDA PRADO';
  assert.ok(run(text).every((f) => !f.value.includes('\n')));
  const md = '## CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL\nLOCADOR: JOÃO CARLOS DE ALMEIDA PRADO';
  assert.ok(run(md).every((f) => !f.value.includes('\n')));
});

test('continuation: heading on either line blocks it', () => {
  assert.deepEqual(values(people('LOCADOR: João Carlos de Almeida\n## PRADO')), ['João Carlos de Almeida']);
  assert.deepEqual(values(people('## LOCADOR: João Carlos de Almeida\nPrado, brasileiro')), ['João Carlos de Almeida']);
});

test('continuation: signature name line does not absorb the next line', () => {
  assert.deepEqual(values(people('_____\nMaria Fernanda Souza Lima\nLocatária')), ['Maria Fernanda Souza Lima']);
  const stacked = people('_____\nMaria Fernanda Souza Lima\nPedro Henrique Dias');
  assert.equal(stacked[0].value, 'Maria Fernanda Souza Lima');
  assert.ok(stacked.every((f) => !f.value.includes('\n')));
});

test('continuation: next line opening with role, label, list marker or dashes', () => {
  assert.deepEqual(values(people('LOCADOR: João Carlos de Almeida\nLocatária declara')), ['João Carlos de Almeida']);
  assert.deepEqual(values(people('LOCADOR: João Carlos de Almeida\nFIADOR: Pedro Henrique Dias')),
    ['João Carlos de Almeida', 'Pedro Henrique Dias']);
  assert.deepEqual(values(people('TESTEMUNHAS:\n1. Ana Paula Costa\n2. Carlos Eduardo Mendes')),
    ['Ana Paula Costa', 'Carlos Eduardo Mendes']);
  assert.deepEqual(values(people('LOCADOR: João Carlos de Almeida\n_______')), ['João Carlos de Almeida']);
  assert.deepEqual(values(people('LOCADOR: João Carlos de Almeida\n---\nSilva')), ['João Carlos de Almeida']);
});

test('continuation: seven-word cap applies to the whole name', () => {
  const found = people('LOCADOR: Ana Bia Cris Dani Edna Fabi\nGabi, brasileira');
  assert.equal(found.length, 1);
  assert.equal(found[0].value.split(/\s+/).length, 7);
  const capped = people('LOCADOR: Ana Bia Cris Dani Edna Fabi\nGabi Heloisa Iara.');
  assert.ok(capped.every((f) => f.value.split(/\s+/).length <= 7));
});

test('continuation: break after a particle', () => {
  const found = people('LOCADOR: João Carlos de\nAlmeida Prado, brasileiro');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'João Carlos de\nAlmeida Prado');
});

test('continuation: unanchored run continues and counts all words', () => {
  const found = people('compareceu Gustavo Henrique\nLacerda Pinto');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Gustavo Henrique\nLacerda Pinto');
  assert.equal(found[0].confidence, 'medium');
});

test('continuation: reported span is contiguous text', () => {
  const text = 'a\n\nLOCADOR: JOÃO CARLOS DE ALMEIDA\n\nPRADO, brasileiro';
  for (const f of people(text)) assert.equal(NAME_AT(text, f), f.value);
});

test('continuation: companies are not continued', () => {
  const found = companies('CONTRATADA: ALFA SERVIÇOS DE\nENGENHARIA LTDA, pessoa jurídica');
  assert.ok(found.every((f) => !f.value.includes('\n')));
});

// ── Assinatura sem tracejado (D15) ──

test('signature D15: title followed by a role-only line is not a name', () => {
  assert.deepEqual(run('CONTRATO DE EMPREITADA\nCONTRATANTE'), []);
});

test('signature D15: first-name line followed by a role-only line, no dashes', () => {
  const found = people('Ricardo Nogueira Bastos\nContratado');
  assert.deepEqual(values(found), ['Ricardo Nogueira Bastos']);
  assert.equal(found[0].confidence, 'high');
});

test('signature D15: with dashes before, no first-name requirement', () => {
  const found = people('_____\nQuintanilha Zorzi Xavier\nContratado');
  assert.deepEqual(values(found), ['Quintanilha Zorzi Xavier']);
  assert.equal(found[0].confidence, 'high');
});

// ── Continuação exige indício de nome incompleto ──

test('evidence: city and date after the name are not absorbed', () => {
  const text = "FIADOR: Pedro Henrique D'Ávila Neto\n\nSão Paulo, 10 de março de 2025.";
  assert.deepEqual(values(people(text)), ["Pedro Henrique D'Ávila Neto"]);
});

test('evidence: start of a sentence after the name is not absorbed', () => {
  const text = 'Fiador: Pedro Silva Santos\nResponde solidariamente pelas obrigações';
  assert.deepEqual(values(people(text)), ['Pedro Silva Santos']);
});

test('evidence: pending particle at the end of the line', () => {
  const text = 'VENDEDOR: ANTÔNIO CARLOS FERREIRA DE\nMELO vende o imóvel';
  const found = people(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'ANTÔNIO CARLOS FERREIRA DE\nMELO');
});

test('evidence: name that ends the sentence on the next line', () => {
  const text = 'neste ato representada pelo Sr. Ricardo Nogueira\nBastos.';
  const found = people(text);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'Ricardo Nogueira\nBastos');
});

test('evidence: continuation ending its line, or followed by ; or )', () => {
  assert.deepEqual(values(people('LOCADOR: João Carlos\nPrado')), ['João Carlos\nPrado']);
  assert.deepEqual(values(people('LOCADOR: João Carlos\nPrado; e')), ['João Carlos\nPrado']);
  assert.deepEqual(values(people('(LOCADOR: João Carlos\nPrado)')), ['João Carlos\nPrado']);
});

test('evidence: full name confirmed elsewhere joins the break', () => {
  const text = 'LOCATÁRIA: Maria Fernanda Souza Lima, brasileira.\n\nO fiador Maria Fernanda\nSouza Lima responde solidariamente.';
  const joined = values(people(text)).filter((v) => v.includes('\n'));
  assert.deepEqual(joined, ['Maria Fernanda\nSouza Lima']);
});

test('evidence: without confirmation the name stops at the end of its line', () => {
  const text = 'O fiador Maria Fernanda\nSouza Lima responde solidariamente.';
  assert.ok(people(text).every((f) => !f.value.includes('\n')));
});

// ── Assinatura: linha em branco antes do papel ──

test('signature: role-only line after one blank line', () => {
  const found = people('Ricardo Nogueira Bastos\n\nContratado');
  assert.deepEqual(values(found), ['Ricardo Nogueira Bastos']);
  assert.equal(found[0].confidence, 'high');
});

test('signature: blank line before the role still needs a first name without dashes', () => {
  assert.deepEqual(run('CONTRATO DE EMPREITADA\n\nCONTRATANTE'), []);
});
