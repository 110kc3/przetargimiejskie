import { getText } from '../../core/fetch.js';
import { todayWarsaw } from '../common.js';
import { parsePkpDetail, parsePkpListPage, pkpMaxPage } from './parse.js';

const BROWSER_UA = 'Mozilla/5.0 (compatible; PrzetargiMiejskie/1.0; +https://przetargimiejskie.pl)';
const ORIGIN = 'https://www.pkp.pl';
// PKP occasionally drops Azure connections for longer than the core fetcher's
// default four-attempt (~49 s) window. Two extra attempts extend the critical
// list-page window to ~91 s while remaining well inside the provider job cap.
const FETCH_OPTS = { userAgent: BROWSER_UA, retries: 5 };

function listUrl(page, today) {
  const params = new URLSearchParams({
    option: 'com_aukcje2', result: 'show', pkp: '', catg: '1', servitude: '67',
    status: '', woj: '', city: '', date_from: '2020-01-01', date_to: today,
    page_size: '50', strona: String(page),
  });
  return `${ORIGIN}/pl/nieruchomosci-przetargi/?${params}`;
}

export async function crawlPkp(previous = []) {
  const today = todayWarsaw();
  const firstHtml = await getText(listUrl(0, today), FETCH_OPTS);
  const pages = [firstHtml];
  const maxPage = pkpMaxPage(firstHtml);
  for (let page = 1; page <= maxPage; page++) {
    pages.push(await getText(listUrl(page, today), FETCH_OPTS));
  }

  const byId = new Map();
  for (const html of pages) {
    for (const row of parsePkpListPage(html)) byId.set(row.external_id, row);
  }
  const previousById = new Map(previous.map((row) => [row.external_id, row]));
  const records = [];
  for (const row of byId.values()) {
    const prior = previousById.get(row.external_id);
    if (prior?.area_m2 > 0 && prior.offer_url) {
      records.push({
        ...row,
        area_m2: prior.area_m2,
        land_area_m2: prior.land_area_m2 > 0 ? prior.land_area_m2 : null,
        offer_url: prior.offer_url,
      });
      continue;
    }
    try {
      const detail = await getText(row.detail_url, FETCH_OPTS);
      const enriched = parsePkpDetail(detail);
      records.push({
        ...row,
        ...enriched,
        area_m2: enriched.area_m2 ?? row.area_m2,
        land_area_m2: enriched.land_area_m2 ?? row.land_area_m2,
      });
    } catch (error) {
      console.error(`  PKP detail ${row.external_id}: ${error.message}`);
      records.push(row);
    }
  }
  console.error(`  PKP: ${records.length} residential sale auctions across ${pages.length} page(s)`);
  return records;
}
