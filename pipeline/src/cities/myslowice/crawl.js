// Mysłowice crawler — built from the reusable FINN-BIP crawler factory.
//
//   INDEX:    /artykul/aktualne-przetargi   (current, ~23 items, single page)
//             /artykul/archiwum-przetargow  (concluded, ~128 items, single page)
//   ARTICLE:  /artykul/ogloszenie-o-…-przetargu-…-lokalu-mieszkalnego-… (server-rendered)
//
// makeCrawlActive walks both index pages, harvests the /artykul/ogloszenie-…
// announcement links (keeping only the "lokal" slugs via linkFilter), fetches
// each and parses address/area/price/date/round from the body (round from the
// title). One flat per announcement → one active listing; build-properties marks
// past-dated ones `archived`. No PDF/OCR; no sold-price stream, so
// crawlResultDocs() is []. See core/finn-bip.js + parse.js. Verified live
// (June 2026, rendered-DOM spike).

import { config } from './config.js';
import { makeCrawlActive, crawlResultDocs } from '../../core/finn-bip.js';

export const crawlActive = makeCrawlActive({
  id: config.id,
  origin: config.finn.origin,
  indexUrls: config.finn.indexUrls,
  linkFilter: config.finn.linkFilter,
});

export { crawlResultDocs };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
