// Zabrze city adapter — implements the registry contract (see ../index.js).
//
// The city BIP "Lokale mieszkalne" board is crawled ONCE per run (memoised in
// crawl.js); each announcement's attachment is extracted and parsed into
// per-flat active listings, while attachments that are published RESULT
// notices ("INFORMACJA O WYNIKU PRZETARGÓW") feed crawlResultDocs() →
// parseResultDoc() — Zabrze's achieved-price stream (sold/unsold + final
// price per flat).

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
