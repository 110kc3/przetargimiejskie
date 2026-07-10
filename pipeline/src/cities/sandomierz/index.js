import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Sandomierz adapter (SkyCMS; closest analog: bochnia/olkusz). One memoised
// crawl over the "Sprzedaż i dzierżawa mienia komunalnego" board serves both
// streams: sale announcements -> listings/land; "Informacja o wyniku
// przetargu na sprzedaż ..." -> the achieved-price stream via parseResultDoc.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
