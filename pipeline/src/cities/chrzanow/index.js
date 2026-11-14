import { config } from './config.js';
import { crawlActive } from './crawl.js';
import { crawlResultDocs, parseResultDoc } from '../../core/finn-bip.js';


export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
