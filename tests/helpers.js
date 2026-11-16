// Shared test helpers. Fixtures are fully synthetic: invented names and
// generated CPFs/CNPJs with valid check digits. Never add real documents.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { convertToMarkdown } from '../js/markdown.js';
import { headingPattern } from '../js/rules/br.js';

const fixturesDir = new URL('./fixtures/', import.meta.url);

export const fixtureNames = ['locacao.txt', 'servicos.txt', 'compra-venda.txt', 'pdfjs-quebrado.txt'];

export const expected = JSON.parse(readFileSync(new URL('expected.json', fixturesDir), 'utf8'));

// Same pipeline the app runs before detection: raw text -> Markdown.
export function loadFixtureMarkdown(name) {
  const raw = readFileSync(fileURLToPath(new URL(name, fixturesDir)), 'utf8');
  return convertToMarkdown(raw.trim(), headingPattern);
}
