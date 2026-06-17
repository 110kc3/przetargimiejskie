import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Tarnowskie Góry adapter (closest analog: Zabrze). One memoised crawl over both
// boards (5217 buildings+flats, 5216 land) serves both streams:
//   - crawlResultDocs() → published "INFORMACJA o wyniku …" notices (the
//     achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats + buildings are
//     address-keyed (→ properties.json); land (kind:'grunt') is returned via
//     `land` and refresh.js writes it to land.json. Result notices that conclude
//     a flat/building/land join their announcement by address (+ flat-no) +
//     round in build-properties (e.g. `pokoju|10|5`, round 2).
//
// Unlike Zabrze there are no separate crawl-land / crawl-commercial modules:
// the single crawler partitions land out of the active stream itself, because
// the land board (5216) is known up front and every announcement here is a
// single-property PDF.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
