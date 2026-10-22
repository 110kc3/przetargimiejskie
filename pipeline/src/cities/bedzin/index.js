import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Będzin adapter (bedzin.bip.info.pl — server-rendered bip.info.pl CMS).
// Main boards:
//   - Announcements: idmp=943 (Nieruchomości) and idmp=35 (Mieszkania / Ogłoszenia)
//   - Results: idmp=484 (Archiwum Nieruchomości) and idmp=945 (Wyniki)
//
// crawlActive() → { listings, wykaz:[], land, valid_empty, valid_empty_land }
// crawlResultDocs() → [{ text, source_url, auction_date }]
// parseResultDoc(text, fallbackDate, sourceUrl) → [resultRecord]

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
