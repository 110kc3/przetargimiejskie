// Grudziądz city adapter — implements the registry contract (see ../index.js).
//
// Source: city BIP board at bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci
// (plain server-rendered HTML — the whole ~620-row archive is in one fetch,
// no headless rendering needed; see crawl.js). Flat auctions: "przetarg ustny
// nieograniczony … na sprzedaż lokalu/lokali mieszkalnego/mieszkalnych"
// published by Prezydent Grudziądza.
//
//   crawlActive()      → { listings, wykaz:[], land:[] } — active flat auctions
//   crawlResultDocs()  → result notice refs, text pre-extracted (doc/OCR)
//   parseResultDoc()   → achieved price + outcome per flat
//
// See: spikes/kujawsko-pomorskie/grudziadz/grudziadz.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
