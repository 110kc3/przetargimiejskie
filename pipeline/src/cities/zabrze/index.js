import { config } from './config.js';
import { crawlActive as crawlActiveFlats, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { crawlCommercial } from './crawl-commercial.js';
import { parseResultDoc } from './parse.js';

async function crawlActive() {
  const base = await crawlActiveFlats();
  let land = [];
  try {
    land = await crawlLand();
  } catch (err) {
    console.error(`  zabrze land crawl failed (kept flats): ${err.message}`);
  }
  let commercial = [];
  try {
    commercial = await crawlCommercial();
  } catch (err) {
    console.error(`  zabrze commercial crawl failed (kept flats): ${err.message}`);
  }
  return { ...base, listings: [...base.listings, ...commercial], land };
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
