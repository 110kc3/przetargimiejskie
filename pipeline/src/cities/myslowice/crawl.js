// Mysłowice crawler — built from the reusable FINN-BIP crawler factory.
//
//   INDEX:    bip.myslowice.pl FINN category/search pages (config.finn.indexUrls)
//   ARTICLE:  bip.myslowice.pl/artykul/<slug>            (server-rendered)
//
// makeCrawlActive walks each index page, harvests `/artykul/` links, keeps the
// `przetarg ustny … na sprzedaż lokalu mieszkalnego` articles, fetches each and
// parses address/area/price/date/round from the body (round preferentially from
// the title). One flat per announcement → one active listing. No PDF/OCR; no
// sold-price stream, so crawlResultDocs() is []. See core/finn-bip.js + parse.js.
//
// ⚠️ Live host unreachable from the CI sandbox — VALIDATE on first refresh.

import { config } from './config.js';
import { makeCrawlActive, crawlResultDocs } from '../../core/finn-bip.js';

export const crawlActive = makeCrawlActive({
  id: config.id,
  origin: config.finn.origin,
  indexUrls: config.finn.indexUrls,
});

export { crawlResultDocs };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
