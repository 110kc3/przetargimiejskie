import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Poznań adapter (bespoke bip.poznan.pl WGN board). crawlActive() harvests the
// department's live announcement board (JSON API) and fetches each notice's
// linked "pełna treść ogłoszenia" PDF for the starting price. crawlResultDocs()
// hits the real, confirmed "wyniki przetargów" category (8800) the same way;
// see config.js for the achieved-price groundtruthing caveat. source:'html' ⇒
// result refs already carry `.text`.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
