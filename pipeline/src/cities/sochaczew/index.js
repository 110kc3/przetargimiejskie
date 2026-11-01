import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const sochaczew = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default sochaczew;
