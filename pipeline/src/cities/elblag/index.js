import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Elbląg adapter (closest analog: Tarnowskie Góry / Kędzierzyn-Koźle — same
// Logonet CMS vendor). One memoised crawl over the "Przetargi - zbycie" board
// serves both streams:
//   - crawlResultDocs() → batch "Informacja o wynikach przetargów …" documents
//     (the achieved-price stream, deduped by text — see crawl.js). source:'html'
//     means each ref already carries `.text`, which refresh.js hands to
//     parseResultDoc; a single document expands into one record PER TABLE ROW.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/units/buildings are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//     Result rows join their announcement by address (+ round) in
//     build-properties, same as every other Logonet-family adapter.
//
// The bezprzetargowo (tenant-sale) exclusion is enforced twice: structurally,
// by never crawling board 191 (the wykaz board), and explicitly, via
// parse.js's isBezprzetargowoDoc() gate inside both parseAnnouncement and
// parseResultDoc — see config.js for the full rationale.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
