// Rybnik city adapter — implements the registry contract (see ../index.js).
//
// Both flats AND land are published on the city BIP "Ogłoszenia o przetargach"
// register (bip.um.rybnik.eu, Page=339) — flats as "Przetarg … ul. <addr>" RTF
// announcements, land as "ogłoszenie … nieruchomości gruntowej" RTFs. The
// crawl-land.js crawler triages that single page: flats → `listings`, land →
// `land`. (The legacy standalone ZGM BIP page that crawl.js targets is dead —
// 0 announcements — so it contributes nothing; it is kept only as a resilient
// fallback in case ZGM ever republishes there.)
//
// crawlActive() merges both sources. If either is unreachable the other still
// succeeds. No results stream is wired (crawlResultDocs() returns []).

import { config } from './config.js';
import { crawlActive as crawlZgmActive, crawlResultDocs } from './crawl.js';
import { crawlLand } from './crawl-land.js';
import { parseResultDoc } from './parse.js';

/** Merge city-BIP flats + land (Page=339) with any legacy ZGM-page flats. */
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

  // De-dupe flats by address key in case ZGM ever republishes one already seen
  // on the city BIP (city-BIP record wins — it is the live source).
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
