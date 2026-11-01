import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const elk = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default elk;
