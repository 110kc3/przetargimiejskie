// Myslowice parsers — re-exports from core/finn-bip.js.
// The FINN eUrząd parsing logic is entirely shared; this module satisfies the
// adapter contract (parse surface, tests, future Myslowice-specific overrides).
//
// Confirmed phrasings (SPIKE-WAVE2.md, June 2026):
//   title:  "Ogloszenie o I przetargu … na sprzedaz lokalu mieszkalnego nr 47
//            przy ul. Armii Krajowej 6B"
//   price:  "cena wywolawcza … zl"
//   area:   "powierzchnia uzytkowa … m²"
//   date:   "Przetarg odbedzie sie w dniu … 2026 r."
//
// HL-27: parseLandAnnouncement added — land announcements now pass linkFilter
// and are routed via classifyKind(title) in core/finn-bip.js makeCrawlActive.

export {
  htmlToText,
  isFlatAuction,
  isSaleAuction,
  resolveKind,
  roundFromTitle,
  roundFromText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  addressFrom,
  shareFromTitle,
  parseAnnouncement,
  parseLandAnnouncement,
  parseIndexLinks,
  extractArticle,
  parseResultDoc,
} from '../../core/finn-bip.js';

export { classifyKind } from '../../core/classify-kind.js';
