import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Bochnia adapter (WordPress; closest analog: trzebinia). One memoised crawl over
// the "Komunikaty i ogłoszenia" archive serves both streams: announcements →
// listings/land; "Informacja o wyniku / Wyniki … przetargu" → the achieved-price
// stream via parseResultDoc (many Bochnia flat auctions end negatively, so the
// sold-price data is sparse but structurally present).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
