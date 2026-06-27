import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Piła adapter. Server-rendered HTML BIP (bip.pila.pl), single list page for
// active auctions, PDF attachments carry all detail (price, area, terms).
//
// crawlResultDocs() returns refs with { pdfUrl, detail_url, published_date };
// refresh.js fetches the PDF via pdfText(ref.pdfUrl) and passes the text to
// parseResultDoc(text, ref.published_date, ref.pdfUrl).
//
// crawlActive() returns { listings, wykaz:[], land:[] }. All Piła municipal
// flat auctions are address-keyed (→ properties.json); no land or wykaz stream.
//
// Closest analogs: Tarnowskie Góry (HTML BIP, PDF attachments, inline results),
// Wejherowo (index list → article → PDF, custom CMS).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
