import { boot } from './app.js';
import * as rules from './rules/br.js';
import { i18n } from './i18n/pt-BR.js';

boot({ rules, i18n, locale: 'pt-BR' });
