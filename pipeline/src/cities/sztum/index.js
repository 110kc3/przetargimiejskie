import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Sztum adapter.
//   - config: id, teryt, label, voivodeship, authority, host, source
//   - crawlResultDocs() → { pdf_url, auction_date, text }[]
//   - crawlActive() → { listings, wykaz, land, valid_empty, valid_empty_land }
//   - parseResultDoc(text, fallbackDate, sourceUrl) → parsed result records

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
