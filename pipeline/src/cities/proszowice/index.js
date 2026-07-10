import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Proszowice adapter (bespoke ASP city portal; closest analog: bochnia/olkusz).
// One memoised crawl over the "Nieruchomości gminne" board serves both
// streams: announcements ("Ogłoszenie ... na zbycie ...") → listings/land;
// "Informacja o [przeprowadzonym] ... przetargu" → the achieved-price stream
// via parseResultDoc (named buyer + achieved price when a postąpienie
// occurred, "Nikt nie wpłacił wadium" for unsold).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
