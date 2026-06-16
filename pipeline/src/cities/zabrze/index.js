import { config } from './config.js';
import { crawlActive as crawlActiveFlats, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { crawlCommercial } from './crawl-commercial.js';
import { parseResultDoc } from './parse.js';

// crawlActive merges the flats board (549) with the LAND board (555) and the
// COMMERCIAL board (552). Both extra crawls are defensive: a failure in either
// leaves the flats stream intact. Commercial records are kind:'uzytkowy'
// (address-keyed) so they join the active LISTINGS stream → data/zabrze/properties.json;
// land is kind:'grunt' and refresh.js partitions it out of listings into land.json.
async function crawlActive() {
  const base = await crawlActiveFlats(); // { listings, wykaz }
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
