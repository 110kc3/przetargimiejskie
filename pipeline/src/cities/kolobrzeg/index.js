// Kołobrzeg adapter entry point.
//
// Gmina Miasto Kołobrzeg (Prezydent Miasta Kołobrzeg) property auction adapter.
// Source: bip.um.kolobrzeg.pl (Madkom SIP platform, JSON HTTP API).

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
