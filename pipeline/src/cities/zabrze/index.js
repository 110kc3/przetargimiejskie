import { config } from './config.js';
import { crawlActive as crawlActiveFlats, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { parseResultDoc } from './parse.js';

// crawlActive merges the flats/houses/commercial board (549) with the LAND
// board (555). Land is defensive: a land-crawl failure leaves the flats stream
// intact (refresh.js partitions kind:'grunt' from `land` into data/zabrze/land.json).
async function crawlActive() {
  const base = await crawlActiveFlats(); // { listings, wykaz }
  let land = [];
  try {
    land = await crawlLand();
  } catch (err) {
    console.error(`  zabrze land crawl failed (kept flats): ${err.message}`);
  }
  return { ...base, land };
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
