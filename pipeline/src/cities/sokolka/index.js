import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const sokolka = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default sokolka;
