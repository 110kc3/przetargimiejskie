// Nowa Sól city adapter — implements the registry contract (see ../index.js).
//
// Source: nowasol.pl/przetargi (WordPress, server-rendered HTML).
// See config.js for full rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz: [] }   from nowasol.pl/przetargi index + detail pages
//   crawlResultDocs()  → []  (stub — result stream not confirmed; see config.js)
//   parseResultDoc()   → []  (stub — see parse.js for implementation plan)

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
