import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const krotoszyn = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default krotoszyn;
