import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Lębork adapter (bip.um.lebork.pl — bespoke slug-addressed BIP; closest built
// analogs: Wąbrzeźno for the multi-lokal flat parser + content-routed
// announce/result split, Zgorzelec for the html-board → article → inline-text
// flow). One memoised walk of the recursive "Sprzedaż i dzierżawa nieruchomości
// - przetargi" tree (board → year → month → leaf) serves both streams:
//   - crawlActive() → { listings, wykaz:[], land }. Flats / commercial units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. A single
//     MULTI-LOKAL notice is split into one record per lokal. Cancelled
//     ("Odwołanie przetargów"), leases (dzierżawa/najem) and rokowania are skipped;
//     only genuinely upcoming auctions (auction_date ≥ today, or dateless) are
//     returned as active.
//   - crawlResultDocs() → concluded "Informacja … o wyniku / po … przetargu"
//     records (achieved price / negative outcome). source:'html' ⇒ each ref carries
//     the pre-built `.text` blob (inline HTML), which refresh.js hands straight to
//     parseResultDoc as `text`, with `ref.pdf_url` (provenance) and
//     `ref.auction_date` (fallback date).

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
