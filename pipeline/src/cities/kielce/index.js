// Kielce city adapter — implements the registry contract (see ../index.js).
//
// Source: SmartSite BIP board at bipum.kielce.eu (server-rendered HTML,
// paginated, no JS wall). Flat auction data:
//   - Active listings: board-page titles carry round + area + address;
//     starting price and auction date live in PDF/DOCX attachments.
//   - Result notices: DOCX attachments on the same board, parsed for
//     achieved price + outcome via parseResultDoc.
//
// Closest analog: Bytom (same SmartSite CMS, same DOCX result pattern).
// See spikes/swietokrzyskie/kielce/kielce.md for the spike verdict.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
