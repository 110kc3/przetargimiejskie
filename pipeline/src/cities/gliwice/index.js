
import { config } from './config.js';
import { crawlAllResultPdfs } from './crawl-results.js';
import { crawlActive as crawlActiveZgm } from './crawl-active.js';
import { crawlBipSales, foldBipDuplicates } from './crawl-bip.js';
import { crawlDetailAreas } from './crawl-detail-areas.js';
import { augmentActiveWithWadium } from './augment-active.js';
import { parseResultPdf } from './parse-result.js';
import { crawlMsipLand } from './crawl-land.js';

async function crawlActive() {
  const zgm = await crawlActiveZgm();

  let bip = { listings: [], land: [] };
  try {
    bip = await crawlBipSales();
  } catch (err) {
    console.error(`  WARN: BIP (bip.gliwice.eu) crawl failed (${err.message}); ZGM listings only.`);
  }

  let msipLand = [];
  try {
    msipLand = await crawlMsipLand();
  } catch (err) {
    console.error(`  WARN: MSIP land crawl failed (${err.message}); MSIP land omitted this run.`);
  }

  const listings = foldBipDuplicates([...zgm.listings, ...bip.listings]);
  const land = [...msipLand, ...bip.land];
  return { listings, wykaz: zgm.wykaz, land };
}

export default {
  ...config,
  crawlResultDocs: crawlAllResultPdfs,
  parseResultDoc: parseResultPdf,
  crawlActive,
  enrichActive: augmentActiveWithWadium,
  crawlDetailAreas,
};
