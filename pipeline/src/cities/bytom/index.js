
import { config } from './config.js';
import { crawlActive, crawlResultDocs, enrichActive } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
  enrichActive,
};
