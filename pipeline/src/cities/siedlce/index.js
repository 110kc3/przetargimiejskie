import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Siedlce adapter (Vela/ESC SA CMS "Aktualności"; closest analog: bochnia). One
// memoised search-driven crawl serves both streams: sale announcements ->
// listings/land (mieszkalny + zabudowana observed live; grunt routed through
// the shared finn-bip land parser if it ever appears); the achieved-price
// stream is not published online anywhere (§12 of the auction regulation —
// physical noticeboard only), so crawlResultDocs()/parseResultDoc are no-op
// stubs, same contract as the plain FINN-BIP cities.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
