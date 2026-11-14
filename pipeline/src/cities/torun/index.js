import { config } from './config.js';
import { crawlActive, crawlResultDocs, crawlDetailAreas } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  crawlDetailAreas,
  parseResultDoc,
};
