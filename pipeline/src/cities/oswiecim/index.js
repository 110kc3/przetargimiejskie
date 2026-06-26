import { config } from './config.js';
import { crawlActive } from './crawl.js';
import { crawlResultDocs, parseResultDoc } from '../../core/finn-bip.js';

// Oświęcim adapter (REKORD SI BIP, multi-property notices). Announcement-side for
// now — result notices are scanned PDFs (no clean achieved-price stream yet), so
// crawlResultDocs / parseResultDoc are the shared FINN-BIP stubs. crawlActive
// parses dokument HTML, falling back to attachment-PDF text (pdftotext → OCR).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
