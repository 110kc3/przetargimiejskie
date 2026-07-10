// Chodzież city adapter — implements the registry contract (see ../index.js).
//
// Single host (bip.chodziez.pl, WOKISS BIP, plain server-rendered HTML — no
// render.js needed). See config.js for full rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz, land }  from the yearly ogłoszenia
//                          + wykazy boards
//   crawlResultDocs()  → Array<{text, date, url}>    from the yearly wyniki
//                          board (confirmed empty as of 2026-07-10 — poll
//                          weekly to catch a result inside its 7-day window)
//   parseResultDoc()   → Array<ResultRecord>         template-groundtruthed,
//                          UNVERIFIED against a live result page (see parse.js)

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
