import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Oświęcim adapter (REKORD SI BIP, multi-property notices). crawlActive parses
// dokument HTML, falling back to attachment-PDF text (pdftotext → OCR). Result
// notices ("Informacja o wyniku przetargu") share the board: the same crawl
// pass collects them, OCRs the scanned attachment (cached), and parseResultDoc
// extracts achieved price + outcome ("Cena uzyskana w wyniku przetargu").

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
