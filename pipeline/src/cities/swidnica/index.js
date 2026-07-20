import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Świdnica adapter (bip.swidnica.nv.pl JSON API — see config.js for the "no
// headless rendering needed" finding). One memoised crawl over the
// "Sprzedaż i dzierżawa nieruchomości" board serves both streams;
// source:'html' ⇒ each result ref already carries its extracted `.text`
// (the article's `content` field, flattened), so parseResultDoc parses it
// directly with no re-fetch.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
