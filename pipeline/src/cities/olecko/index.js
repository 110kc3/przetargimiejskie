import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const olecko = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default olecko;
