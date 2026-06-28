import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Chełm adapter — lubelskie.pl BIP platform (DataTables API + text PDFs).
//
// Board: https://umchelm.bip.lubelskie.pl/index.php?id=55  (796 records, 2013–2026)
// Documents: Prezydent Miasta Chełm — standard "OGŁOSZENIE O PRZETARGU" text PDFs.
// Achieved-price stream: WEAK (~5 result notices in the whole board). crawlResultDocs()
// returns what exists; refresh.js passes each ref's .text to parseResultDoc.
//
// source:'html' → crawlResultDocs() refs carry .text already; refresh.js bypasses
// the generic PDF-OCR dispatch for result docs.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
