import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Wałbrzych adapter — closest analog: Tarnowskie Góry.
//
// Streams:
//   crawlActive()       → { listings, wykaz:[], land:[] }
//     Flats from /przetargi-nieruchomosci/{page}/25, filtered in-process.
//
//   crawlResultDocs()   → refs with .text already set (source:'html')
//     Each ref = one result-notice PDF (may cover multiple property types).
//     parseResultDoc() filters flat rows from the multi-column table.
//
// source:'html' means refresh.js will pass each ref's .text directly to
// parseResultDoc() rather than dispatching through pdfText/ocr.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
