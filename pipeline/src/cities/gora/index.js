// Góra adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.gora.com.pl (2ClickPortal, server-rendered with a browser
// UA — no needsRender). Two attachment-listing boards:
//   Announcements: /233-przetargi.html      — crawlActive()     → { listings }
//   Results:       /wyniki-przetargow.html   — crawlResultDocs() → result refs
//   parseResultDoc()  → achieved price + outcome per flat (DOCX/PDF text)
//
// See: spikes/dolnoslaskie/powiat-gorowski/gora.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
