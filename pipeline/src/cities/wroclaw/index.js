import { config } from './config.js';
import { crawlActive, enrichActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Wrocław adapter (bespoke bip.um.wroc.pl Logonet eUrząd BIP + gn.um.wroc.pl
// Giełda Nieruchomości as a secondary achieved-price source). crawlActive()
// returns "Aktualne" lokal-mieszkalny listings; enrichActive() fills area_m2
// from each announcement's .docx attachment; crawlResultDocs() merges the BIP
// "Informacja o wyniku" .docx stream (primary, ~7-day RODO window) with a
// bounded Giełda ID scan (secondary/backfill) — parseResultDoc() parses both
// via the shared synthetic header block crawl.js prepends to each ref's text.

export default {
  ...config,
  crawlActive,
  enrichActive,
  crawlResultDocs,
  parseResultDoc,
};
