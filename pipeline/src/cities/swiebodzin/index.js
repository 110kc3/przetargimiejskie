import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const swiebodzin = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default swiebodzin;
