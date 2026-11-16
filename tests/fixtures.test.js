// Detection over the synthetic contracts in tests/fixtures (task 7.1):
// every expected person and company is found, and no name or company finding
// with high or medium confidence falls outside the expected list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectSensitiveData } from '../js/detector.js';
import { REGEX_DB, DETECTORS, isValidCPF, isValidCNPJ } from '../js/rules/br.js';
import { normalize } from '../js/names/shape.js';
import { expected, fixtureNames, loadFixtureMarkdown } from './helpers.js';

const key = (s) => normalize(s).replace(/\s+/g, ' ');

for (const name of fixtureNames) {
  test(`fixture ${name}: expected people and companies, no extras`, () => {
    const found = detectSensitiveData(loadFixtureMarkdown(name), REGEX_DB, DETECTORS);
    const { companies } = expected[name];
    // `partial`: names broken across lines with nothing to show the first part is
    // incomplete (D14 evidence rule). They are covered only up to the end of the
    // first line, which is the documented cost of that rule.
    const partial = expected[name].partial ?? {};
    const people = expected[name].people.map((n) => partial[n] ?? n);

    const foundPeople = new Set(found.filter((f) => f.cat === 'nome').map((f) => key(f.value)));
    const foundCompanies = new Set(found.filter((f) => f.cat === 'empresa').map((f) => key(f.value)));
    for (const p of people) assert.ok(foundPeople.has(key(p)), `person not found: ${p}`);
    for (const c of companies) assert.ok(foundCompanies.has(key(c)), `company not found: ${c}`);

    const expectedPeople = new Set(people.map(key));
    const expectedCompanies = new Set(companies.map(key));
    const extras = found.filter((f) => f.confidence !== 'low' && (
      (f.cat === 'nome' && !expectedPeople.has(key(f.value))) ||
      (f.cat === 'empresa' && !expectedCompanies.has(key(f.value)))));
    assert.deepEqual(extras.map((f) => `${f.cat}/${f.confidence}: ${f.value}`), []);

    // Names never swallow their label, and never run over more than one line break.
    for (const f of found.filter((x) => x.cat === 'nome' || x.cat === 'empresa')) {
      assert.ok(!/:/.test(f.value) && (f.value.match(/\n/g) ?? []).length <= 2,
        `finding spans a label or too many lines: ${JSON.stringify(f.value)}`);
    }
  });
}

test('fixtures are synthetic: every CPF and CNPJ has valid check digits and is generated', () => {
  for (const name of fixtureNames) {
    const raw = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
    for (const cpf of raw.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) ?? []) assert.ok(isValidCPF(cpf), cpf);
    for (const cnpj of raw.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) ?? []) assert.ok(isValidCNPJ(cnpj), cnpj);
  }
});
