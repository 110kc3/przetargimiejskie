import { config } from './config.js';
import { crawlActive } from './crawl.js';
import { crawlResultDocs, parseResultDoc } from '../../core/finn-bip.js';

// Olkusz adapter (WordPress). Offer-side only — no achieved-price stream was
// found for gmina sales, so crawlResultDocs / parseResultDoc are the shared
// FINN-BIP stubs (return empty). Announcements → listings + land.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
