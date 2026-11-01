import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const ostrowWielkopolski = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default ostrowWielkopolski;
