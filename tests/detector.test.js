import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSensitiveData } from '../js/detector.js';
import { REGEX_DB as US_RULES } from '../js/rules/us.js';
import { REGEX_DB as BR_RULES } from '../js/rules/br.js';

// Verbatim copy of the pre-confidence algorithm (first one reaching a position
// wins). Kept as the reference that proves US and numeric BR rules are unchanged.
function legacyDetect(text, regexDb) {
  const found = [];
  const seen = new Set();
  for (const rule of regexDb) {
    const re = new RegExp(rule.regex.source, rule.regex.flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      const value = match[0];
      const key = `${rule.id}::${match.index}::${value}`;
      if (rule.validate && !rule.validate(value)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const replacement = rule.replacement_fn ? rule.replacement_fn(value) : rule.replacement;
      found.push({ id: rule.id, cat: rule.cat, label: rule.label, value, index: match.index, length: value.length, replacement });
    }
  }
  found.sort((a, b) => a.index - b.index);
  const cleaned = [];
  let lastEnd = -1;
  for (const f of found) {
    if (f.index >= lastEnd) { cleaned.push(f); lastEnd = f.index + f.length; }
  }
  return cleaned;
}

// Findings without the `confidence` field added by the new detector.
const stripConfidence = (list) => list.map(({ confidence, ...rest }) => rest);

const NUMERIC_BR_RULES = BR_RULES.filter((r) => r.cat !== 'nome');

const US_TEXT = `Patient John Q. Public, SSN 123-45-6789, born 03/14/1980.
Phone (415) 555-0132, email jane.doe@example.com, ZIP 94105.
Card 4111 1111 1111 1111, EIN 12-3456789, routing 021000021.
Address: 123 Main Street, Springfield. Amount $1,250.00 on 2024-05-01.`;

const BR_TEXT = `CPF 123.456.780-62 e CNPJ 11.222.333/0001-30, RG 12.345.678-9.
Telefone (11) 91234-5678, e-mail fulano@exemplo.com.br, CEP 01310-100.
Rua das Acácias, 120, Jardim Primavera. Valor R$ 2.500,00 em 10/03/2024.
Agência 1234-5 Conta 123456-7. Placa ABC-1234.`;

test('US rules: result identical to the previous algorithm', () => {
  const now = stripConfidence(detectSensitiveData(US_TEXT, US_RULES));
  assert.ok(now.length > 5, 'sanity: the text must produce findings');
  assert.deepEqual(now, legacyDetect(US_TEXT, US_RULES));
});

test('numeric BR rules: result identical to the previous algorithm', () => {
  const now = stripConfidence(detectSensitiveData(BR_TEXT, NUMERIC_BR_RULES));
  assert.ok(now.length > 5, 'sanity: the text must produce findings');
  assert.deepEqual(now, legacyDetect(BR_TEXT, NUMERIC_BR_RULES));
});

test('US + BR numeric rules mixed (overlapping matches)', () => {
  const mixed = [...US_RULES, ...NUMERIC_BR_RULES];
  const text = `${US_TEXT}\n${BR_TEXT}\n12345678901 e 11222333000130 soltos.`;
  const now = stripConfidence(detectSensitiveData(text, mixed));
  assert.deepEqual(now, legacyDetect(text, mixed));
});

// ── Confidence (specs/detection-confidence) ──

const rule = (over) => ({ id: 'r', cat: 'x', label: 'X', replacement: 'R', ...over });

test('rule without confidence yields high', () => {
  const [f] = detectSensitiveData('abc', [rule({ regex: /abc/g })]);
  assert.equal(f.confidence, 'high');
});

test('rule can declare its confidence', () => {
  const [f] = detectSensitiveData('abc', [rule({ regex: /abc/g, confidence: 'low' })]);
  assert.equal(f.confidence, 'low');
});

test('US edition: SSN finding has high confidence', () => {
  const found = detectSensitiveData('SSN 123-45-6789', US_RULES);
  assert.ok(found.length > 0);
  assert.ok(found.every((f) => f.confidence === 'high'));
});

test('function detector findings are included, defaulting to high', () => {
  const detector = (text) => [{ id: 'd', cat: 'nome', label: 'Nome', value: 'bc', index: text.indexOf('bc'), length: 2, replacement: 'R' }];
  const found = detectSensitiveData('abcd', [], [detector]);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'bc');
  assert.equal(found[0].confidence, 'high');
});

test('overlap: high confidence wins even when low starts first', () => {
  const rules = [
    rule({ id: 'low', regex: /abcd/g, confidence: 'low' }),
    rule({ id: 'high', regex: /cdef/g }),
  ];
  const found = detectSensitiveData('abcdef', rules);
  assert.deepEqual(found.map((f) => f.id), ['high']);
});

test('overlap: medium beats low, high beats medium', () => {
  const rules = [
    rule({ id: 'l', regex: /aaaa/g, confidence: 'low' }),
    rule({ id: 'm', regex: /aabb/g, confidence: 'medium' }),
    rule({ id: 'h', regex: /bbcc/g }),
  ];
  const found = detectSensitiveData('aaaabbcc', rules);
  assert.deepEqual(found.map((f) => f.id), ['l', 'h']); // sorted by position
});

test('overlap: same confidence keeps the one that starts first', () => {
  const rules = [
    rule({ id: 'late', regex: /cdef/g }),
    rule({ id: 'early', regex: /abcd/g }),
  ];
  const found = detectSensitiveData('abcdef', rules);
  assert.deepEqual(found.map((f) => f.id), ['early']);
});

test('result is sorted by position and non-overlapping', () => {
  const rules = [
    rule({ id: 'a', regex: /zz/g }),
    rule({ id: 'b', regex: /aa/g, confidence: 'low' }),
    rule({ id: 'c', regex: /mm/g, confidence: 'medium' }),
  ];
  const found = detectSensitiveData('aa mm zz aa', rules);
  assert.deepEqual(found.map((f) => f.index), [0, 3, 6, 9]);
});
