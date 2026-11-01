import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const czluchow = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default czluchow;
