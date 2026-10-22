// Iława city adapter — implements the registry contract (see pipeline/ADAPTER-GUIDE.md).
//
// Source: bip.umilawa.pl (systemdobip.pl HTML BIP with doc/docx/PDF attachments).
// source:'html' — the adapter extracts attachment text itself.
//   crawlActive()     → { listings, wykaz:[], land, valid_empty, valid_empty_land }
//   crawlResultDocs() → result refs with `.text` already extracted
//   parseResultDoc()  → achieved price + outcome (sold/unsold) per auction

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
