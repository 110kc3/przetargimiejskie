import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Łódź adapter (bip.uml.lodz.pl, TYPO3). One memoised crawl over the
// active + 2026-archive listing pages serves both streams:
//   - crawlActive() → { listings, wykaz:[], land }. Flats and commercial
//     units are address-keyed (→ properties.json / active.json); land
//     (kind:'grunt') is returned via `land` (→ land.json).
//   - crawlResultDocs() → result PDF refs, each carrying `.text` (the
//     pre-extracted pdftotext output). source:'html' means refresh.js
//     hands the text directly to parseResultDoc without re-fetching.
//
// Each result PDF is a "INFORMACJA o wynikach …" multi-lot document attached
// to the announcement article AFTER the auction. The crawl discovers it by
// checking whether the article HTML has a second PDF link labelled
// "Informacja o wynikach przetargów [.pdf]".

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
