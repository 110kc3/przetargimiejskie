// Gniezno city adapter — implements the registry contract (see ../index.js).
//
// Sources:
//   crawlActive()       → BIP listing (bip.gniezno.eu) — flat-sale announcements
//   crawlResultDocs()   → gniezno.eu Aktualności — inline HTML result notices
//   parseResultDoc()    → parses one result notice text (achieved price + outcome)
//
// The BIP listing is the spine for active/multi-round flats; the gniezno.eu
// result notices supply the achieved-price stream (cena osiągnięta, nabywca).
// See spikes/wielkopolskie/powiat-gnieznienski/gniezno.md for full analysis.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
