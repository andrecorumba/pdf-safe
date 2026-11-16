// ═══════════════════════════════════════════════════
//  REGEX DATABASE — Brazilian PII Detection
// ═══════════════════════════════════════════════════
import { detectNames } from '../names/br.js';

// ── CPF / CNPJ VALIDATORS (reduce false positives on bare numbers) ──
export function isValidCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === +d[10];
}

export function isValidCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n) => {
    let s = 0, w = n + 1;
    for (let i = 0; i < n; i++) { if (--w < 2) w = 9; s += +d[i] * w; }
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

export const REGEX_DB = [
  // ── CPF ──
  { id: 'cpf', cat: 'cpf', label: 'CPF',
    regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    replacement: 'XXX.XXX.XXX-XX' },
  { id: 'cpf_nums', cat: 'cpf', label: 'CPF',
    regex: /(?:CPF|cpf|C\.?P\.?F\.?)\s*[:–\-nº°]?\s*(\d{3}\.?\d{3}\.?\d{3}[\-.]?\d{2})/gi,
    replacement: 'CPF: XXX.XXX.XXX-XX', fullMatch: true },
  { id: 'cpf_bare_dash', cat: 'cpf', label: 'CPF',
    regex: /\b\d{9}-\d{2}\b/g,
    replacement: 'XXX.XXX.XXX-XX' },
  { id: 'cpf_plain', cat: 'cpf', label: 'CPF',
    regex: /\b\d{11}\b/g,
    replacement: 'XXX.XXX.XXX-XX',
    validate: (m) => isValidCPF(m) },

  // ── CNPJ ──
  { id: 'cnpj', cat: 'cnpj', label: 'CNPJ',
    regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    replacement: 'XX.XXX.XXX/XXXX-XX' },
  { id: 'cnpj_label', cat: 'cnpj', label: 'CNPJ',
    regex: /(?:CNPJ|cnpj|C\.?N\.?P\.?J\.?)\s*[:–\-nº°]?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi,
    replacement: 'CNPJ: XX.XXX.XXX/XXXX-XX', fullMatch: true },
  { id: 'cnpj_slash_nodots', cat: 'cnpj', label: 'CNPJ',
    regex: /\b\d{8}\/\d{4}-\d{2}\b/g,
    replacement: 'XX.XXX.XXX/XXXX-XX' },
  { id: 'cnpj_plain', cat: 'cnpj', label: 'CNPJ',
    regex: /\b\d{14}\b/g,
    replacement: 'XX.XXX.XXX/XXXX-XX',
    validate: (m) => isValidCNPJ(m) },

  // ── RG ──
  { id: 'rg_label', cat: 'rg', label: 'RG',
    regex: /(?:RG|R\.?G\.?|Registro\s*Geral|Identidade|Carteira\s*de\s*Identidade)\s*[:–\-nº°]?\s*(\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]?)/gi,
    replacement: 'RG: XX.XXX.XXX-X', fullMatch: true },
  { id: 'rg_ssp', cat: 'rg', label: 'RG/SSP',
    regex: /\b(\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]?)\s*[-\/]?\s*(?:SSP|ssp)\s*[-\/]?\s*([A-Z]{2})\b/gi,
    replacement: 'XX.XXX.XXX-X SSP/UF', fullMatch: true },

  // ── CNH ──
  { id: 'cnh', cat: 'documento', label: 'CNH',
    regex: /(?:CNH|C\.?N\.?H\.?|Habilitação|Carteira\s*(?:Nacional\s*)?(?:de\s*)?Habilitação)\s*[:–\-nº°]?\s*(\d{11})/gi,
    replacement: 'CNH: XXXXXXXXXXX', fullMatch: true },

  // ── Título de Eleitor ──
  { id: 'titulo', cat: 'documento', label: 'Título Eleitor',
    regex: /(?:T[ií]tulo\s*(?:de\s*)?Eleitor|Título\s*Eleitoral|Inscrição\s*Eleitoral)\s*[:–\-nº°]?\s*(\d{4}\s?\d{4}\s?\d{4})/gi,
    replacement: 'Título Eleitor: XXXX XXXX XXXX', fullMatch: true },

  // ── PIS/PASEP/NIT ──
  { id: 'pis', cat: 'documento', label: 'PIS/NIT',
    regex: /(?:PIS|PASEP|NIT|P\.?I\.?S\.?)\s*[:–\-nº°]?\s*(\d{3}\.?\d{5}\.?\d{2}-?\d{1})/gi,
    replacement: 'PIS: XXX.XXXXX.XX-X', fullMatch: true },

  // ── CTPS ──
  { id: 'ctps', cat: 'documento', label: 'CTPS',
    regex: /(?:CTPS|Carteira\s*de\s*Trabalho)\s*[:–\-nº°]?\s*(\d{5,7})\s*[-\/]?\s*(?:Série|Serie|Ser\.)\s*[:–\-]?\s*(\d{3,5})/gi,
    replacement: 'CTPS: XXXXXXX Série: XXXXX', fullMatch: true },

  // ── Cartão SUS ──
  { id: 'sus', cat: 'documento', label: 'SUS',
    regex: /(?:CNS|Cartão\s*(?:Nacional\s*)?(?:de\s*)?(?:Saúde|Saude)|Cartão\s*SUS|SUS)\s*[:–\-nº°]?\s*([12]\d{2}\s?\d{4}\s?\d{4}\s?\d{4})/gi,
    replacement: 'SUS: XXX XXXX XXXX XXXX', fullMatch: true },

  // ── Passaporte ──
  { id: 'passaporte', cat: 'documento', label: 'Passaporte',
    regex: /(?:Passaporte|Passport)\s*[:–\-nº°]?\s*([A-Z]{2}\d{6})/gi,
    replacement: 'Passaporte: XXXXXXXX', fullMatch: true },

  // ── Registros profissionais ──
  { id: 'oab', cat: 'documento', label: 'OAB',
    regex: /(?:OAB|O\.A\.B\.?)\s*[-\/]?\s*([A-Z]{2})\s*[-\/]?\s*(\d{3,6})/gi,
    replacement: 'OAB/UF XXXXXX', fullMatch: true },
  { id: 'crm', cat: 'documento', label: 'CRM',
    regex: /(?:CRM|C\.R\.M\.?)\s*[-\/]?\s*([A-Z]{2})\s*[-\/]?\s*(\d{4,7})/gi,
    replacement: 'CRM/UF XXXXXX', fullMatch: true },
  { id: 'crea', cat: 'documento', label: 'CREA',
    regex: /(?:CREA|C\.R\.E\.A\.?)\s*[-\/]?\s*([A-Z]{2})\s*[-\/]?\s*(\d{4,10})/gi,
    replacement: 'CREA/UF XXXXXXXXXX', fullMatch: true },

  // ── Placa veicular ──
  { id: 'placa_old', cat: 'documento', label: 'Placa',
    regex: /\b[A-Z]{3}-\d{4}\b/g,
    replacement: 'XXX-0000',
    validate: (m) => {
      const prefix = m.substring(0, 3);
      const excluded = ['SAC','IGP','FGV','PAR','ART','COM','LEI','PRO','SAO','RIO','PAG','SET','OUT','NOV','DEZ','JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','CPF','RUA'];
      return !excluded.includes(prefix);
    }
  },
  { id: 'placa_new', cat: 'documento', label: 'Placa Mercosul',
    regex: /\b[A-Z]{3}\d[A-Z]\d{2}\b/g,
    replacement: 'XXX0X00',
    validate: (m) => {
      const prefix = m.substring(0, 3);
      const excluded = ['SAC','IGP','FGV','PAR','ART','COM','LEI','PRO'];
      return !excluded.includes(prefix);
    }
  },

  // ── RENAVAM ──
  { id: 'renavam', cat: 'documento', label: 'RENAVAM',
    regex: /(?:RENAVAM|Renavam)\s*[:–\-nº°]?\s*(\d{9,11})/gi,
    replacement: 'RENAVAM: XXXXXXXXXXX', fullMatch: true },

  // ── CEP ──
  { id: 'cep', cat: 'cep', label: 'CEP',
    regex: /\b\d{5}-\d{3}\b/g,
    replacement: 'XXXXX-XXX' },
  { id: 'cep_label', cat: 'cep', label: 'CEP',
    regex: /(?:CEP|C\.?E\.?P\.?|Código\s*Postal)\s*[:–\-]?\s*(\d{5}-?\d{3})/gi,
    replacement: 'CEP: XXXXX-XXX', fullMatch: true },

  // ── Endereço ──
  { id: 'endereco', cat: 'endereco', label: 'Endereço',
    regex: /(?<![a-zA-ZÀ-ÚÇà-úç])(?:Rua|Avenida|Alameda|Travessa|Praça|Largo|Rodovia|Estrada|Viela|Beco|Ladeira|Viaduto|R\.\s|Av\.\s|Al\.\s|Trav\.\s|Rod\.\s|Estr\.\s|Pça\.\s)\s*[A-ZÀ-ÚÇa-zà-úç0-9\s.,'º°ª\-]{3,60}(?:[,;]\s*(?:n[º°.]?|nro\.?|número)?\s*\d{1,6})?/gi,
    replacement: '[ENDEREÇO OCULTADO]' },
  { id: 'endereco_label', cat: 'endereco', label: 'Endereço',
    regex: /(?:Endereço|Endereco)\s*[:–\-]\s*[A-ZÀ-ÚÇa-zà-úç0-9\s.,'\-º°ª]{5,100}/gi,
    replacement: 'Endereço: [ENDEREÇO OCULTADO]', fullMatch: true },

  // ── Bairro ──
  { id: 'bairro', cat: 'endereco', label: 'Bairro',
    regex: /(?:Bairro|Bro\.)\s*[:–\-]?\s*([A-ZÀ-ÚÇa-zà-úç\s]{2,40})/gi,
    replacement: 'Bairro: [BAIRRO OCULTADO]', fullMatch: true },

  // ── Telefone ──
  { id: 'tel_cel', cat: 'telefone', label: 'Celular',
    regex: /\(\d{2}\)\s*9\d{4}-?\d{4}/g,
    replacement: '(XX) 9XXXX-XXXX' },
  { id: 'tel_fixo', cat: 'telefone', label: 'Fixo',
    regex: /\(\d{2}\)\s*[2-5]\d{3}-?\d{4}/g,
    replacement: '(XX) XXXX-XXXX' },
  { id: 'tel_intl', cat: 'telefone', label: 'Tel +55',
    regex: /(?:\+55|0055)\s?\(?\d{2}\)?\s?9?\d{4}[-\s.]?\d{4}/g,
    replacement: '+55 (XX) XXXXX-XXXX' },
  { id: 'tel_0800', cat: 'telefone', label: '0800',
    regex: /\b0800[-\s]?\d{3}[-\s]?\d{4}\b/g,
    replacement: '0800-XXX-XXXX' },

  // ── E-mail ──
  { id: 'email', cat: 'email', label: 'E-mail',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
    replacement: 'email@ocultado.com' },

  // ── Valores monetários ──
  { id: 'valor_rs', cat: 'financeiro', label: 'R$',
    regex: /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g,
    replacement: 'R$ X.XXX,XX' },

  // ── Dados bancários ──
  { id: 'agencia', cat: 'financeiro', label: 'Agência',
    regex: /(?:Agência|Agencia|Ag\.)\s*[:–\-]?\s*(\d{4})-?([0-9Xx])?/gi,
    replacement: 'Agência: XXXX-X', fullMatch: true },
  { id: 'conta', cat: 'financeiro', label: 'Conta',
    regex: /(?:Conta|C\/C|C\.C\.|C\/P|Conta\s*Corrente|Conta\s*Poupança)\s*[:–\-]?\s*(\d{4,12})-?([0-9Xx])?/gi,
    replacement: 'Conta: XXXXXXXX-X', fullMatch: true },

  // ── PIX ──
  { id: 'pix_evp', cat: 'financeiro', label: 'PIX EVP',
    regex: /(?:PIX|Pix|pix|Chave\s*PIX)\s*[:–\-]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    replacement: 'PIX: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', fullMatch: true },

  // ── Boleto ──
  { id: 'boleto', cat: 'financeiro', label: 'Boleto',
    regex: /\d{5}\.?\d{5}\s?\d{5}\.?\d{6}\s?\d{5}\.?\d{6}\s?\d\s?\d{14}/g,
    replacement: '[CÓDIGO BOLETO OCULTADO]' },

  // ── Datas ──
  { id: 'data_br', cat: 'data', label: 'Data',
    regex: /\b(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g,
    replacement: 'XX/XX/XXXX' },
  { id: 'data_extenso', cat: 'data', label: 'Data ext.',
    regex: /\b(?:0?[1-9]|[12]\d|3[01])\s+(?:de\s+)?(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(?:19|20)\d{2}\b/gi,
    replacement: 'XX de XXXXXXX de XXXX' },

  // ── Processo judicial CNJ ──
  { id: 'processo_cnj', cat: 'documento', label: 'Processo',
    regex: /\b\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}\b/g,
    replacement: 'XXXXXXX-XX.XXXX.X.XX.XXXX' },

  // ── Inscrição Estadual ──
  { id: 'ie', cat: 'documento', label: 'IE',
    regex: /(?:I\.?E\.?|Inscrição\s*Estadual|Inscr\.?\s*Est\.?)\s*[:–\-nº°]?\s*([\d.\/-]{8,18})/gi,
    replacement: 'IE: XXXXXXXXXXXX', fullMatch: true },
];

// Person and company names are not regex rules: they depend on neighbouring
// lines and on earlier findings, so they run as function detectors.
// See js/names/br.js.
export const DETECTORS = [detectNames];

// Category metadata.
//   label    — plural form, used in filter chips and the summary bar
//   singular — used on the type pill of manually added findings
//   option   — label in the manual-category dropdown (defaults to `singular`)
//   tone     — highlight / pill color role, defined in css/app.css
//   summary  — value color class in the summary bar
export const CATEGORIES = {
  cpf:        { label: 'CPF',        singular: 'CPF',        icon: '🪪',  tone: 'danger',  summary: 'sc-danger' },
  cnpj:       { label: 'CNPJ',       singular: 'CNPJ',       icon: '🏢', tone: 'purple',  summary: 'sc-danger' },
  rg:         { label: 'RG',         singular: 'RG',         icon: '🆔', tone: 'warn',    summary: 'sc-warn' },
  nome:       { label: 'Nomes',      singular: 'Nome',       icon: '👤', tone: 'info',    summary: 'sc-info' },
  empresa:    { label: 'Empresa',    singular: 'Empresa',    icon: '🏭', tone: 'teal',    summary: 'sc-info' },
  endereco:   { label: 'Endereço',   singular: 'Endereço',   icon: '📍', tone: 'cyan',    summary: 'sc-info' },
  cep:        { label: 'CEP',        singular: 'CEP',        icon: '📮', tone: 'success', summary: 'sc-success' },
  telefone:   { label: 'Telefone',   singular: 'Telefone',   icon: '📞', tone: 'accent',  summary: 'sc-warn' },
  email:      { label: 'E-mail',     singular: 'E-mail',     icon: '📧', tone: 'pink',    summary: 'sc-warn' },
  financeiro: { label: 'Financeiro', singular: 'Financeiro', icon: '💰', tone: 'amber',   summary: 'sc-danger' },
  data:       { label: 'Datas',      singular: 'Data',       icon: '📅', tone: 'indigo',  summary: 'sc-info' },
  documento:  { label: 'Documentos', singular: 'Documento',  icon: '📋', tone: 'rose',    summary: 'sc-warn' },
  manual:     { label: 'Manual',     singular: 'Manual',     icon: '✏️', tone: 'slate',   summary: 'sc-info', option: 'Outro' },
};

// Categories offered in the manual-selection dropdown, in display order.
export const MANUAL_CATEGORIES = [
  'cpf', 'cnpj', 'rg', 'nome', 'empresa', 'endereco', 'email',
  'telefone', 'financeiro', 'data', 'documento', 'manual',
];

// Lines matching this pattern become Markdown headings. Includes accented
// uppercase, which Portuguese documents rely on.
export const headingPattern = /^([A-ZÀ-ÚÇ\s]{4,60})$/gm;
