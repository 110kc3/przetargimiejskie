import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crawlAll, parseBoardPage } from '../src/cities/trzebnica/crawl.js';
import { buildLand, mergePartialLand } from '../src/core/build-land.js';
import { buildCityData } from '../src/core/build-properties.js';
import { mergeProperties } from '../src/core/merge-history.js';
import { buildRecordText, parseResultDoc } from '../src/cities/trzebnica/parse.js';
import { applyDurablePropertyHeals } from '../src/core/verified-heals.js';

// Exact article elements from the official board XML, fetched 2026-10-19.
// The small pagination envelope below is synthetic so failures are deterministic.
const articles = ['3489', '3490'].map((id) => readFileSync(new URL(`./fixtures/remediation/trzebnica-board-${id}.xml`, import.meta.url), 'utf8'));
const knownUrls = new Set(articles.flatMap((xml) => parseBoardPage(xml).map((ref) => ref.url)));
const board = (body = articles.join(''), pages = 1, count = 2) => `<przetargi-nieruchomosci><strona>1</strona><ilosc-stron>${pages}</ilosc-stron><ilosc-rekordow>${count}</ilosc-rekordow><artykuly>${body}</artykuly></przetargi-nieruchomosci>`;

test('a complete board of captured historical records confirms empty current streams', async () => {
  let requests = 0;
  const result = await crawlAll({ knownUrls, cutoff: '2026-10-16', fetchText: async () => { requests++; return board(); } });
  assert.equal(requests, 1, 'known history does not need detail or attachment requests');
  assert.deepEqual(result.listings, []);
  assert.deepEqual(result.land, []);
  assert.equal(result.valid_empty, true);
  assert.equal(result.valid_empty_land, true);
  assert.equal(result.resultRefs.complete, true);
  assert.equal(result.land_complete, false, 'incremental output must merge with retained parcel history');
  const previous = buildLand([{ kind: 'grunt', dzialka_nr: '1/2', auction_date: '2025-01-02', outcome: 'sold', final_price_pln: 200000 }], 'trzebnica').plots;
  const merged = mergePartialLand(previous, buildLand(result.land, 'trzebnica').plots);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].listings[0].outcome, 'sold');
  assert.equal(merged[0].listings[0].final_price_pln, 200000);
});

test('a failed later board page cannot confirm an empty stream', async () => {
  let requests = 0;
  const result = await crawlAll({ knownUrls, cutoff: '2026-10-16', fetchText: async () => {
    if (++requests === 1) return board(undefined, 2);
    throw new Error('connection reset');
  } });
  assert.equal(requests, 2);
  assert.equal(result.valid_empty, false);
  assert.equal(result.resultRefs.complete, false);
});

test('changed XML, missing metadata, unparsed rows and duplicate pages withhold proof', async () => {
  for (const xml of [
    '<h1>Service unavailable</h1>',
    board().replace('<ilosc-stron>1</ilosc-stron>', ''),
    board().replace('/przetarg-nieruchomosci/3489/', '/changed/3489/'),
    board(undefined, 2), // page 2 repeats page 1 instead of returning new rows
  ]) {
    const result = await crawlAll({ knownUrls, cutoff: '2026-10-16', fetchText: async () => xml });
    assert.equal(result.valid_empty, false);
    assert.equal(result.valid_empty_land, false);
    assert.equal(result.resultRefs.complete, false);
  }
});

test('known URLs never skip current records and detail failures remain incomplete', async () => {
  let details = 0;
  const result = await crawlAll({ knownUrls, cutoff: '2026-09-01', fetchText: async (url) => {
    if (url.includes('/przetargi-nieruchomosci/')) return board();
    details++;
    throw new Error('detail unavailable');
  } });
  assert.equal(details, 2);
  assert.equal(result.valid_empty, false);
  assert.equal(result.resultRefs.complete, false);
});

test('a wrong detail response cannot be accepted using only the board fields', async () => {
  const result = await crawlAll({ knownUrls: new Set(), cutoff: '2026-09-01', fetchText: async (url) =>
    url.includes('/przetargi-nieruchomosci/') ? board() : '<h1>Not found</h1>' });
  assert.equal(result.valid_empty, false);
  assert.equal(result.resultRefs.complete, false);
  assert.equal(result.listings.length, 0);
});

test('a historical flat with a village-only board address is recovered from its own PDF', async () => {
  const url = 'https://bip.trzebnica.pl/attachments/download/7181';
  const text = readFileSync(new URL('../pdf-text-cache/7181.1e14fe84.txt', import.meta.url), 'utf8');
  const detail = articles[0].replace('</artykul>', `<zalaczniki><zalacznik><url>${url}</url><nazwa>Ogłoszenie</nazwa></zalacznik></zalaczniki></artykul>`);
  let extracted = 0;
  const result = await crawlAll({ knownUrls: new Set(), cutoff: '2026-10-16', fetchText: async (request) =>
    request.includes('/przetargi-nieruchomosci/') ? board(articles[0], 1, 1) : detail,
  extractText: async (request) => { assert.equal(request, url); extracted++; return text; } });
  assert.equal(extracted, 1);
  assert.equal(result.listings.length, 1);
  assert.equal(result.listings[0].auction_date, '2026-09-21');
  assert.equal(result.listings[0].area_m2, 93.4);
  assert.equal(result.listings[0].starting_price_pln, 149450);
  assert.equal(result.listings[0].source_url, url);
  assert.equal(result.listings[0].auction_date_estimated, true);
  assert.equal(result.valid_empty, false);
});

test('uncached historical identity work is bounded and a truncated pass stays incomplete', async () => {
  // Synthetic identities/pagination reuse the real flat fields to stress the
  // request budget without making network requests or writing text caches.
  const ids = Array.from({ length: 14 }, (_, index) => String(9000 + index));
  const entries = ids.map((id) => articles[0].replaceAll('/3489/', `/${id}/`));
  const text = readFileSync(new URL('../pdf-text-cache/7181.1e14fe84.txt', import.meta.url), 'utf8');
  let extracted = 0;
  const result = await crawlAll({ knownUrls: new Set(), cutoff: '2026-10-16', fetchText: async (url) => {
    if (url.includes('/przetargi-nieruchomosci/')) return board(entries.join(''), 1, entries.length);
    const id = url.match(/xml\/(\d+)/)[1];
    return entries[ids.indexOf(id)].replace('</artykul>', `<zalaczniki><zalacznik><url>https://example.invalid/${id}.pdf</url><nazwa>Ogłoszenie</nazwa></zalacznik></zalaczniki></artykul>`);
  }, extractText: async () => { extracted++; return text; } });
  assert.equal(extracted, 12);
  assert.equal(result.listings.length, 12);
  assert.equal(result.resultRefs.complete, false);
  assert.equal(result.valid_empty, false);
  assert.equal(result.land_complete, false);
});

test('published result notices recover the stated Boleścin 50/2 identity and negative outcomes', () => {
  const cases = [['7167', '2026-08-10', 1], ['7396', '2026-09-21', 2]];
  const records = [];
  for (const [id, date, round] of cases) {
    const wynik = readFileSync(new URL(`./fixtures/remediation/trzebnica-result-${id}.txt`, import.meta.url), 'utf8');
    const text = buildRecordText({ adres: 'Boleścin', rodzaj: 'Lokal mieszkalny', data: date.split('-').reverse().join('.'),
      przetargNa: `${round === 1 ? 'I' : 'II'} przetarg ustny nieograniczony`, wynik });
    const rows = parseResultDoc(text, null, `https://bip.trzebnica.pl/attachments/download/${id}`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].address.key, 'bolescin|50|2');
    assert.equal(rows[0].source_pdf, `https://bip.trzebnica.pl/attachments/download/${id}`);
    assert.equal(rows[0].auction_date, date);
    assert.equal(rows[0].round, round);
    assert.equal(rows[0].outcome, 'unsold');
    assert.equal(rows[0].starting_price_pln, 149450);
    assert.equal(rows[0].final_price_pln, null);
    records.push(...rows);
  }
  const old = { key: 'bolescin|0|2', street: 'Boleścin', street_norm: 'bolescin', building: '0', apt: '2', kind: 'mieszkalny', area_m2: 93.4,
    listings: [
      { date: '2026-08-10', outcome: 'archived', detail_url: 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3445/przetargggnp142026' },
      { date: '2026-09-21', outcome: 'archived', detail_url: 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3489/przetarg-nr-ggn-p-18-2026' },
    ] };
  const incoming = buildCityData({ allRecords: records, active: [], wykaz: [], detailAreas: new Map() }).properties;
  const healed = applyDurablePropertyHeals(mergeProperties([old], incoming).properties, 'trzebnica');
  assert.equal(healed.length, 1);
  assert.equal(healed[0].key, 'bolescin|50|2');
  assert.ok(healed[0].legacy_keys.includes(old.key));
  assert.equal(healed[0].listings.length, 2);
  assert.ok(healed[0].listings.every((listing) => listing.outcome === 'unsold' && listing.source_pdf));
});

test('verified identity migration preserves aliases and leaves unrelated unknown-building rows alone', () => {
  const announcement = readFileSync(new URL('./fixtures/remediation/trzebnica-announcement-6341.txt', import.meta.url), 'utf8');
  assert.ok(/^Boleścin[^\n]*\n(?:[^\n]*\n)?\s*50\/2\b/m.test(announcement), 'the original February announcement states the same identity');
  const old = { key: 'bolescin|0|2', street: 'Boleścin', street_norm: 'bolescin', building: '0', apt: '2', kind: 'mieszkalny', area_m2: 93.4,
    listings: [
      { date: '2026-02-27', outcome: 'archived', detail_url: 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3110/przetarg-ggn-p-5-2026' },
      { date: '2026-08-10', outcome: 'archived', detail_url: 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3445/przetargggnp142026' },
      { date: '2026-09-21', outcome: 'archived', detail_url: 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3489/przetarg-nr-ggn-p-18-2026' },
    ] };
  const migrated = applyDurablePropertyHeals([structuredClone(old)], 'trzebnica');
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].key, 'bolescin|50|2');
  assert.ok(migrated[0].legacy_keys.includes(old.key));
  assert.equal(migrated[0].listings.length, 3);
  const unknown = { date: '2025-01-02', outcome: 'archived', source_pdf: 'https://example.invalid/unverified.pdf' };
  const mixed = applyDurablePropertyHeals([{ ...structuredClone(old), listings: [...structuredClone(old.listings), unknown] }], 'trzebnica');
  assert.equal(mixed.find((p) => p.key === old.key).listings.length, 1);
  assert.equal(mixed.find((p) => p.key === 'bolescin|50|2').listings.length, 3);
  assert.deepEqual(mixed.find((p) => p.key === 'bolescin|50|2').legacy_keys, []);
});

test('attachment extraction failures cannot masquerade as successful result discovery', async () => {
  const result = await crawlAll({ knownUrls: new Set(), cutoff: '2026-09-01', fetchText: async (url) => {
    if (url.includes('/przetargi-nieruchomosci/')) return board();
    const article = articles.find((xml) => xml.includes(`/przetarg-nieruchomosci/${url.match(/xml\/(\d+)/)[1]}/`));
    return article.replace('</artykul>', '<zalaczniki><zalacznik><url>https://bip.trzebnica.pl/result.pdf</url><nazwa>Informacja o wyniku przetargu</nazwa></zalacznik></zalaczniki></artykul>');
  }, extractText: async () => { throw new Error('PDF unavailable'); } });
  assert.equal(result.valid_empty, false);
  assert.equal(result.resultRefs.complete, false);
});
