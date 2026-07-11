import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Pszczyna adapter (ESC S.A. / VelaBIP; closest analog: bochnia). One memoised
// crawl over the site search ("sprzedaż lokalu mieszkalnego" +
// "sprzedaż nieruchomości niezabudowanej") serves both streams: announcements
// -> listings/land; "Informacja o wyniku …" -> the achieved-price stream via
// parseResultDoc (structured HTML table when sold; prose "wynikiem negatywnym"
// when not).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
