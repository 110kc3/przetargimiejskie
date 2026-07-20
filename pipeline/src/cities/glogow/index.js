import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Głogów adapter (glogow.bip.info.pl — the spike profiled a server-rendered
// bip.info.pl BIP, but the host live-migrated to an Angular SPA backed by a
// JSON:API REST layer under /api/fo/ on 2026-07-10; see config.js + crawl.js
// headers for the full story). ONE board — "Sprzedaż nieruchomości gminnych"
// (legacy idmp=27, now category "przedmiotowe27d") — carries BOTH streams,
// title/body-routed in parse.js. One memoised crawl serves both:
//   - crawlActive() → { listings, wykaz:[], land }. Flats / commercial units /
//     garages / whole houses are address-keyed (→ properties.json); land
//     (kind:'grunt') is parcel-keyed (→ land.json). Only genuinely upcoming
//     auctions are returned as active — the board accumulates full history.
//   - crawlResultDocs() → concluded "INFORMACJA o wyniku …" records (achieved
//     price / negative outcome). source:'html' ⇒ each ref carries the
//     pre-built `.text` blob (title + attachment-PDF text) plus the
//     `pdf_url`/`auction_date` refresh.js hands to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// HTML/JSON. `fallbackDate` is the article's publication date captured during
// the crawl (the body's own "Przetarg przeprowadzono w dniu …" wins).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
