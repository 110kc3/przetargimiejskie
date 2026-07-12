// Lipsko adapter — entry point.
// Exports the adapter object consumed by pipeline/src/cities/index.js.
//
// DO NOT add this to pipeline/src/cities/index.js yet — that is a separate step.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default { ...config, crawlActive, crawlResultDocs, parseResultDoc };
