// Węgorzewo city adapter — implements the registry contract (see ../index.js).
//
// IDcom BIP (bip.wegorzewo.pl), same host shape as gizycko. UNLIKE gizycko,
// results live on a separate category from announcements and are plain
// inline HTML (no scanned-PDF/OCR stub needed) — see parse.js and crawl.js
// header comments for the live-verified details.
//
// See spikes/warminsko-mazurskie/powiat-wegorzewski/wegorzewo.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
