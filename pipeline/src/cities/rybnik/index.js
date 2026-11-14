
import { config } from './config.js';
import { crawlActive as crawlZgmActive, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { parseResultDoc } from './parse.js';

async function crawlActive() {
  const [zgm, bip] = await Promise.allSettled([
    crawlZgmActive(),
    crawlLand(),
  ]);

  const { listings: zgmListings = [], wykaz = [] } =
    zgm.status === 'fulfilled' ? zgm.value : (() => {
      console.error(`  rybnik: ZGM crawl failed: ${zgm.reason?.message}`);
      return {};
    })();

  const { land: landRecords = [], listings: bipListings = [] } =
    bip.status === 'fulfilled' ? bip.value : (() => {
      console.error(`  rybnik: city-BIP crawl failed: ${bip.reason?.message}`);
      return {};
    })();

  const seen = new Set(bipListings.map((l) => l.address?.key).filter(Boolean));
  const listings = [
    ...bipListings,
    ...zgmListings.filter((l) => !l.address?.key || !seen.has(l.address.key)),
  ];

  return { listings, wykaz, land: landRecords };
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
