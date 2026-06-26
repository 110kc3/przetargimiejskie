import { config } from './config.js';
import { crawlActive } from './crawl.js';
import { crawlResultDocs, parseResultDoc } from '../../core/finn-bip.js';

// Chrzanów adapter (city portal index + SPA BIP bodies via the headless renderer).
// Multi-property land tables. Result notices ("Wyniki przetargów") not yet
// ingested → the shared FINN-BIP stubs.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
