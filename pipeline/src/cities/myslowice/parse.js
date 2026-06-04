// Mysłowice parsers.
//
// Mysłowice runs on the FINN eUrząd platform, so all the parsing is the shared
// FINN-BIP logic in core/finn-bip.js. This module just re-exports those pure
// functions under the city's own path — so the adapter's parse surface, tests,
// and any future Mysłowice-specific override all live here, and the registry
// contract's parseResultDoc is satisfied.
//
// Confirmed phrasings (SPIKE-WAVE2.md, June 2026):
//   title:  "Ogłoszenie o I przetargu … na sprzedaż lokalu mieszkalnego nr 47
//            przy ul. Armii Krajowej 6B"            (round in the title)
//   price:  "cena wywoławcza … zł"
//   area:   "powierzchnia użytkowa … m²"
//   date:   "Przetarg odbędzie się w dniu … 2026 r." (held in sala 204 UM)

export {
  htmlToText,
  isFlatAuction,
  roundFromTitle,
  roundFromText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  addressFrom,
  parseAnnouncement,
  parseIndexLinks,
  extractArticle,
  parseResultDoc,
} from '../../core/finn-bip.js';
