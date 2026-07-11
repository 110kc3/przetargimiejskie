import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Głubczyce adapter (closest STRUCTURAL analog: Kędzierzyn-Koźle — same
// board→attachment→extract-text→route-by-body flow). One memoised crawl over the
// two boards serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" notices from board /145/
//     (the achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc together with the
//     attachment URL (the flat street is recovered from that URL's filename slug).
//   - crawlActive() → { listings, wykaz:[], land }. Flats/houses/commercial are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. Result
//     notices join their announcement by address (+ unit) + round in
//     build-properties.
//
// The .doc/.pdf format split and the newest-N-per-board crawl bound are handled
// in crawl.js; the catdoc binary-garbage and filename-address quirks in parse.js.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
