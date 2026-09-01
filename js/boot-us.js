import { boot } from './app.js';
import * as rules from './rules/us.js';
import { i18n } from './i18n/en-US.js';

boot({ rules, i18n, locale: 'en-US' });
