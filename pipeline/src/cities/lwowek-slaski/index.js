// Lwówek Śląski adapter — entry point.
// Exports the adapter object consumed by pipeline/src/cities/index.js.
//
// DO NOT add this to pipeline/src/cities/index.js yet — that is a separate step.
//
// bip.lwowekslaski.pl — an IDcom.pl bip-v1 server-HTML BIP (see config.js /
// crawl.js). One memoised crawl of the "Przetargi" board (id 3) serves both
// streams:
//   - crawlActive()     → { listings, wykaz:[], land }. Undeveloped parcels
//     (kind:'grunt') → land.json; flats/commercial/built units → address-keyed
//     properties.json.
//   - crawlResultDocs() → concluded "Informacja o wyniku / o nabywcy" records
//     (achieved price / negative outcome). source:'html' ⇒ each ref carries the
//     pre-built `.text` blob (article title + born-digital PDF body), which
//     refresh.js hands to parseResultDoc with ref.auction_date + ref.pdf_url.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default { ...config, crawlActive, crawlResultDocs, parseResultDoc };
