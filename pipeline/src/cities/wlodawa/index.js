import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const wlodawa = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default wlodawa;
