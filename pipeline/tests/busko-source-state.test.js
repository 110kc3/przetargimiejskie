import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crawlAll, harvestAnnouncementLinks } from '../src/cities/busko-zdroj/crawl.js';
import { parseLandAnnouncementListings, parseResultDoc, parseResultLink } from '../src/cities/busko-zdroj/parse.js';
import { buildLand } from '../src/core/build-land.js';

const fixture = name => readFileSync(new URL(`./fixtures/remediation/busko-${name}`, import.meta.url), 'utf8');
const current = fixture('26223.html');
const historical = fixture('25302.html');
const announcement = fixture('bloniec.txt');
const results = fixture('land-results.txt');
const generatedFeed = page => `<div class="com-content-category-blog"><a href="/ogloszenia/${900000 + page}-other.html">Other notice</a>
  <a aria-current="true">${page + 1}</a>
  ${page < 41 ? `<a href="/ogloszenia.html?start=${(page + 1) * 10}">Next</a>` : ''}</div>`;

function fetcher(url) {
  const parsed = new URL(url);
  if (parsed.pathname === '/ogloszenia.html') {
    const page = Number(parsed.searchParams.get('start') || 0) / 10;
    return [0, 3, 31, 41].includes(page) ? fixture(`feed-page${page}.html`) : generatedFeed(page);
  }
  if (parsed.pathname.startsWith('/ogloszenia/26223-')) return current;
  if (parsed.pathname.startsWith('/ogloszenia/25302-')) return historical;
  throw Error(`Unexpected source request ${url}`);
}

test('the full linked feed reaches the known auction beyond the former page-30 cutoff', async () => {
  const requests = [];
  const links = await harvestAnnouncementLinks({ fetchText: async url => { requests.push(url); return fetcher(url); } });
  assert.equal(requests.length, 42);
  assert.equal(links.length, 2);
  assert.equal(links.complete, true);
  assert.ok(links.some(link => link.url.includes('/25302-')));
  const capped = await harvestAnnouncementLinks({ maxPages: 30, fetchText: async url => fetcher(url) });
  assert.equal(capped.complete, false);
  assert.equal(capped.length, 1);
});

test('a failed, ignored or unrecognised feed page cannot establish completeness', async () => {
  for (const mode of ['failed', 'repeated', 'markup']) {
    const links = await harvestAnnouncementLinks({ fetchText: async url => {
      if (!url.includes('start=')) return fixture('feed-page0.html');
      if (mode === 'failed') throw Error('connection failed');
      return mode === 'repeated' ? fixture('feed-page0.html') : '<html>Service unavailable</html>';
    } });
    assert.equal(links.complete, false);
  }
});

test('enumerated land prices are matched to parcels, not the later deposit amounts', () => {
  const rows = parseLandAnnouncementListings(historical, 'article');
  assert.deepEqual(rows.map(r => [r.dzialka_nr, r.obreb, r.area_m2, r.starting_price_pln]), [
    ['271', '11', 1718, 760000], ['273', '11', 1935, 860000], ['789/15', '06', 175, 30000],
  ]);
  assert.ok(rows.every(r => r.auction_date === '2026-04-23'));
  assert.deepEqual(parseLandAnnouncementListings(historical.replace('760 000,00 zł dz.', '760 000,00 zł other.'), 'article'), []);
});

test('the PDF-only Błoniec sale explicitly excludes tenant-owned building improvements', () => {
  const [row] = parseLandAnnouncementListings(announcement, 'article', 'announcement.pdf');
  assert.equal(row.kind, 'grunt');
  assert.equal(row.dzialka_nr, '360/2');
  assert.equal(row.area_m2, 549);
  assert.equal(row.starting_price_pln, 22000);
  assert.equal(row.auction_date, '2026-11-06');
  assert.equal(row.address_raw, 'Błoniec, dz. 360/2');
  assert.ok(row.notes.some(note => note.includes('nie obejmuje nakładów')));
  assert.equal(row.source_url, 'announcement.pdf');
  assert.deepEqual(parseLandAnnouncementListings(announcement.replace('nie są uwzględnione', 'są uwzględnione'), 'article'), []);
  assert.deepEqual(parseLandAnnouncementListings(announcement.replace('06.11.2026', '31.02.2026'), 'article'), []);
});

test('result PDF is not reused as an announcement and sold land keeps its achieved price', () => {
  const links = parseResultLink(historical);
  assert.notEqual(links.resultPdf, links.announcementPdf);
  assert.ok(links.announcementPdf.includes('obwieszczenie_gnwr'));
  const rows = parseResultDoc(results, '2026-05-04', 'result.pdf');
  assert.deepEqual(rows.map(r => [r.dzialka_nr, r.starting_price_pln, r.final_price_pln, r.outcome]), [
    ['271', 760000, 768000, 'sold'], ['273', 860000, 869000, 'sold'], ['789/15', 30000, 45000, 'sold'],
  ]);
  assert.ok(rows.every(r => r.auction_date === '2026-04-23' && r.source_pdf === 'result.pdf'));
});

test('shared crawl reads each page/article once, extracts the announcement fallback and result PDF', async () => {
  const requests = [];
  const output = await crawlAll({ fetchText: async url => { requests.push(url); return fetcher(url); },
    extractText: async url => url.includes('bloniec') ? announcement : results });
  assert.equal(requests.length, 44);
  assert.equal(new Set(requests).size, 44);
  assert.equal(output.listings.length, 0);
  assert.equal(output.land.length, 4);
  assert.equal(output.resultDocs.length, 1);
  assert.equal(output.resultDocs.complete, true);
  assert.equal(output.resultDocs[0].auction_date, null);
  assert.equal(output.land_complete, false);
  const plots = buildLand([...output.land, ...parseResultDoc(results, null, 'result.pdf')], 'busko-zdroj').plots;
  assert.equal(plots.length, 4);
  for (const plot of plots.filter(p => p.dzialka_nr !== '360/2')) {
    assert.equal(plot.listings.length, 1);
    assert.equal(plot.listings[0].outcome, 'sold');
    assert.ok(plot.listings[0].final_price_pln > plot.listings[0].starting_price_pln);
    assert.equal(plot.listings[0].source_url, 'result.pdf');
  }
});

test('announcement/result extraction failures and unsupported sale bodies stay incomplete', async () => {
  for (const mode of ['announcement', 'result', 'unsupported', 'undated']) {
    const output = await crawlAll({ fetchText: async url => mode === 'unsupported' && url.includes('/26223-') ? '<html>Unsupported sale</html>' : fetcher(url),
      extractText: async url => {
        if ((mode === 'announcement' && url.includes('bloniec')) || (mode === 'result' && !url.includes('bloniec'))) throw Error('extraction failed');
        return url.includes('bloniec') ? announcement : mode === 'undated' ? results.replace('23 kwietnia 2026', 'niepodanym terminie') : results;
      } });
    assert.equal(output.resultDocs.complete, false);
  }
});
