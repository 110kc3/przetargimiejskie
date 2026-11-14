import { config } from './config.js';
import { crawlActive, enrichActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';


export default {
  ...config,
  crawlActive,
  enrichActive,
  crawlResultDocs,
  parseResultDoc,
};
