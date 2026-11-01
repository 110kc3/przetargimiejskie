import { config } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export const lobez = {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};

export default lobez;
