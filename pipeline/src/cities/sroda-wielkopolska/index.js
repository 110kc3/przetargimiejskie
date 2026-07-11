// Środa Wielkopolska city adapter — implements the registry contract (see
// ../index.js).
//
// Sources:
//   crawlActive()       → bip.umsroda.pl "Ogłoszenia o przetargach" board —
//                          flat + land sale announcements (leases/procedural
//                          notices/wykaz filtered out — see crawl.js/parse.js)
//   crawlResultDocs()    → bip.umsroda.pl "Wyniki przetargów" board — flat
//                          result refs (achieved price + outcome)
//   parseResultDoc()     → parses one result notice text into 0/1 records
//
// See spikes/wielkopolskie/powiat-sredzki/sroda-wielkopolska.md for the full
// source analysis (CMS family, boards, volume, blockers).

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
