import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Szczecinek adapter (closest analog: tarnowskie-gory / kedzierzyn-kozle /
// skarzysko-kamienna — same Logonet eUrząd CMS). Two independent board
// families crawled in parallel (see crawl.js):
//   - crawlResultDocs() → board 338 "Informacja o wyniku przetargu" refs.
//     source:'html' means each ref already carries `.text` — either the HTML
//     stub body (solo flat results, which this office never backs with a
//     PDF) or a results-table PDF's extracted text (land/mixed-batch
//     results) — parseResultDoc handles both shapes uniformly.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/buildings are
//     address-keyed (→ properties.json); land (kind:'grunt') is returned via
//     `land` and refresh.js writes it to land.json. A result joins its
//     announcement by address(+flat-no)/dzialka_nr + round in
//     build-properties.
//
// wykaz is always [] here — pre-auction designations are filtered out by
// isSkippableTitle at crawl time (same convention as the two direct Logonet
// analogs), not carried through as a separate pre-listing stream.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
