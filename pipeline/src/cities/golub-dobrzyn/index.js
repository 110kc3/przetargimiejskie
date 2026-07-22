import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Golub-Dobrzyń adapter (dual-publisher bip.net 7.32; closest built analog:
// rawa-mazowiecka for the same CMS's board-walk + inline-result architecture).
// One memoised crawl serves both streams from two publishers:
//   - POWIAT (Starostwo, bip.golub-dobrzyn.com.pl): the paginated general board
//     824, title-prefiltered to property auctions, each detail's inline HTML.
//   - MIASTO (Burmistrz, bip.golub-dobrzyn.pl): born-digital PDF attachments on
//     the sprzedaż board 760 + recent Ogłoszenia year boards (best-effort).
//   crawlActive() → { listings, wykaz:[], land }. Flats/commercial are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//   crawlResultDocs() → concluded "Informacja o wyniku …" records (achieved
//     price / unsold). source:'html' ⇒ each ref carries the pre-built `.text`
//     blob (inline HTML or extracted PDF text), which refresh.js hands straight
//     to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw HTML;
// refresh.js passes ref.pdf_url as the source URL and ref.auction_date as the
// fallback date.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
