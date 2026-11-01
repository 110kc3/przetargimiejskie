import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const zambrow = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default zambrow;
