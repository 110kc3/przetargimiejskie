// Kamienna Góra adapter — entry point.
// Exports the adapter object consumed by pipeline/src/cities/index.js.
//
// DO NOT add this to pipeline/src/cities/index.js yet — that is a separate step.
//
// source:'html' means refresh.js hands each result ref's `.text` straight to
// parseResultDoc (no OCR / pdf-text dispatch) — crawlResultDocs already
// pdftotext'd the born-digital "INFORMACJA O WYNIKU" attachment.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default { ...config, crawlActive, crawlResultDocs, parseResultDoc };
