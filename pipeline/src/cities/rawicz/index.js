import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const rawicz = {
  ...CONFIG,
  crawlActive,
  crawlResults,
};

export default rawicz;
