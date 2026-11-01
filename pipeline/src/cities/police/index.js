import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const police = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default police;
