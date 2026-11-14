import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const lubartow = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default lubartow;
