import { config } from "./config.js";
import { crawlActive, crawlResultDocs } from "./crawl.js";
import { parseResultDoc } from "./parse.js";

export * from "./config.js";
export * from "./parse.js";
export * from "./crawl.js";

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
