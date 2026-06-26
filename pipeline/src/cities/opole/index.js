import { config } from './config.js';
import { crawlActive } from './crawl.js';
import { crawlResultDocs, parseResultDoc } from '../../core/finn-bip.js';

// Opole adapter (SISCO BIP). Announcement-only — no web-published achieved-price
// stream was found, so crawlResultDocs / parseResultDoc are the shared FINN-BIP
// stubs (return empty). Announcements → listings + land.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
