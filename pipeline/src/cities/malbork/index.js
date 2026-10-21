// Malbork adapter entry point.
//
// Gmina Miasto Malbork (Burmistrz Miasta Malborka) property auction adapter.
// Source: bip.malbork.pl (Madkom SIP platform, React SPA backed by plain JSON HTTP API).

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
