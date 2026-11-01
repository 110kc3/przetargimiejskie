// Adapter entry point for Kartuzy (powiat kartuski, Pomorskie)
// BIP: https://bip.kartuzy.pl

import config from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  id: config.id,
  teryt: config.teryt,
  label: config.name,
  voivodeship: config.voivodeship,
  authority: config.authority,
  host: config.host,
  source: config.source,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
