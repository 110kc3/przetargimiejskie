import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const sejny = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default sejny;
