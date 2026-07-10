// Międzyrzecz adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.miedzyrzecz.pl — ONE board (Wrota Lubuskie eBIP, same
// engine as gorzow-wielkopolski) doubles as both the announcement AND the
// results engine:
//   Active:   /przetargi/0/status/0/   — crawlActive()     → { listings, wykaz:[], land:[] }
//   Resolved: /przetargi/0/status/1/   — crawlResultDocs() → result refs (text already extracted, source:'html')
//   parseResultDoc()  → achieved price + outcome per flat
//
// See: spikes/lubuskie/powiat-miedzyrzecki/miedzyrzecz.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
