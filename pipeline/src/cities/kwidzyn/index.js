// Kwidzyn adapter — entry point. Exports the adapter object consumed by
// pipeline/src/cities/index.js.
//
// Registered in pipeline/src/cities/index.js; source/asset audit is partial.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default { ...config, crawlActive, crawlResultDocs, parseResultDoc };
