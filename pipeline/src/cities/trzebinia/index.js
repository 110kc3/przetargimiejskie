import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Trzebinia adapter (closest analog: Bytom / the FINN-BIP HTML cities). One
// memoised crawl over the Joomla "Tablica ogłoszeń" board serves both streams:
// announcements → listings/land; "Informacja … o wynikach przetargu" → the
// achieved-price stream via parseResultDoc.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
