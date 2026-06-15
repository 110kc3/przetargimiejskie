// Rybnik city adapter — implements the registry contract (see ../index.js).
//
// TWO independent crawl sources:
//   1. ZGM Rybnik (bip.zgm.rybnik.pl) — flat auctions only.  crawl.js.
//   2. City BIP (bip.um.rybnik.eu, Page=339) — land auctions.  crawl-land.js.
//
// crawlActive() merges both: ZGM flats go into `listings`; city-BIP land plots
// go into `land`. If either source is unreachable the other still succeeds.
// No results stream is wired (crawlResultDocs() returns []).

import { config } from './config.js';
import { crawlActive as crawlZgmActive, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { parseResultDoc } from './parse.js';

/** Merge ZGM flat listings with city-BIP land plots. */
async function crawlActive() {
  const [zgm, land] = await Promise.allSettled([
    crawlZgmActive(),
    crawlLand(),
  ]);

  const { listings = [], wykaz = [] } =
    zgm.status === 'fulfilled' ? zgm.value : (() => {
      console.error(`  rybnik: ZGM crawl failed: ${zgm.reason?.message}`);
      return {};
    })();

  const landRecords =
    land.status === 'fulfilled' ? land.value : (() => {
      console.error(`  rybnik: city-BIP land crawl failed: ${land.reason?.message}`);
      return [];
    })();

  return { listings, wykaz, land: landRecords };
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
