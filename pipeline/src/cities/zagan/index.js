// Żagań adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.zagan.pl — ONE board (SystemDoBIP.pl/E-LINE, same engine
// as gorzow-wielkopolski and miedzyrzecz) doubles as both the announcement AND
// the results engine, land + flats both routed from the same rows:
//   Active:   /przetargi/344/status/0/   — crawlActive()     → { listings, wykaz:[], land }
//   Resolved: /przetargi/344/status/1/   — crawlResultDocs() → result refs (text already extracted, source:'html')
//   parseResultDoc()  → outcome + starting price per flat/land record (achieved
//                        price never published by this city's BIP — see parse.js)
//
// See: spikes/lubuskie/powiat-zaganski/zagan.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
