import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Sopot adapter (bip.sopot.pl JSON API — see config.js for the "no headless
// rendering needed" finding). One memoised crawl over the "Przetargi" board
// serves both streams; source:'html' ⇒ each result ref already carries its
// extracted `.text` (either the article's inline content or an attachment's
// docText/pdfText), so parseResultDoc parses it directly with no re-fetch.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
