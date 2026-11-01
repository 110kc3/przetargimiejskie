import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const olawa = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default olawa;
