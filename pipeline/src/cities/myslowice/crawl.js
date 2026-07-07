// Myslowice crawler -- built from the reusable FINN-BIP crawler factory.

import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { makeCrawlActive, crawlResultDocs } from '../../core/finn-bip.js';

export const crawlActive = makeCrawlActive({
  id: config.id,
  origin: config.finn.origin,
  indexUrls: config.finn.indexUrls,
  linkFilter: config.finn.linkFilter,
});

export { crawlResultDocs };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s); ${land.length} land plot(s)`);
}
