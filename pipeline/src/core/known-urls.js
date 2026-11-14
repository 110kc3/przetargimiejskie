
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DATA_DIR = fileURLToPath(new URL('../../../data', import.meta.url));

export async function loadKnownSourceUrls(cityId, { includeLand = false, resolvedOnly = false, dataDir = DATA_DIR } = {}) {
  const urls = new Set();
  for (const [filename, field] of [['properties.json', 'properties'], ...(includeLand ? [['land.json', 'plots']] : [])]) {
    const filePath = join(dataDir, cityId, filename);
    if (!existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      const records = Array.isArray(parsed?.[field]) ? parsed[field] : [];
      for (const rec of records) {
        for (const listing of Array.isArray(rec?.listings) ? rec.listings : []) {
          if (resolvedOnly && !['sold', 'unsold', 'no_winner'].includes(listing.outcome)) continue;
          if (listing.source_pdf) urls.add(listing.source_pdf);
          if (listing.source_url) urls.add(listing.source_url);
          if (listing.detail_url) urls.add(listing.detail_url);
          if (listing.pdf_url)    urls.add(listing.pdf_url);
        }
      }
    } catch { /* A missing/bad stream must not discard the other stream's known history. */ }
  }
  return urls;
}
