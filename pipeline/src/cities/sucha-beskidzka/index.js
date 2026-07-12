// Sucha Beskidzka adapter — entry point (consumed by pipeline/src/cities/index.js).
// Closest analog: bochnia (custom-HTML board → PDF notices), with wolow's
// round-supersession inference for the result stream (no server-HTML achieved-
// price surface exists — results are on the bip.malopolska JS-SPA, out of scope).
//
// DO NOT add this to pipeline/src/cities/index.js yet — that is a separate step.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default { ...config, crawlActive, crawlResultDocs, parseResultDoc };
