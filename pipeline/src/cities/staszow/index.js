import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const staszow = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default staszow;
