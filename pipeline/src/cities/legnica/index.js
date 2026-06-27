// Legnica city adapter — implements the registry contract (see ../index.js).
//
// Source: BIP-E.PL board at um.bip.legnica.eu (server-rendered HTML, no auth).
// Flat auctions: "ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego"
// published by Prezydent Miasta Legnicy / Wydział Gospodarki Nieruchomościami.
//
//   crawlActive()      → { listings, wykaz:[], land:[] }  — active flat auctions
//   enrichActive()     → fills area_m2 / price / round from .docx attachment
//   crawlResultDocs()  → result notice refs (.doc per notice)
//   parseResultDoc()   → achieved price + outcome per flat
//
// See: spikes/dolnoslaskie/legnica/legnica.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs, enrichActive } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  enrichActive,
  crawlResultDocs,
  parseResultDoc,
};
