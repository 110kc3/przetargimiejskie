import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export { config, crawlActive, crawlResultDocs, parseResultDoc };

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
