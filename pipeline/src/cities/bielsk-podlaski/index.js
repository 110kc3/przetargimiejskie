// Adapter entry point for Bielsk Podlaski (powiat bielski, Podlaskie)
// BIP: https://bip-umbielsk.podlaskie.eu

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
