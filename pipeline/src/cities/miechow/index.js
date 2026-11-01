import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const miechow = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default miechow;
