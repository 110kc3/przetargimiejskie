import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crawlActive as crawlWschowa } from '../src/cities/wschowa/crawl.js';
import { crawlActive as crawlZagan, parseBoardPage } from '../src/cities/zagan/crawl.js';

// Active-board regions (line endings/trailing blanks normalized), fetched on
// 2026-10-19: Wschowa /przetargi/29/status/0/, Żagań /przetargi/344/status/0/.
const fixture = (city) => readFileSync(new URL(`./fixtures/remediation/${city}-active-20261019.html`, import.meta.url), 'utf8');

test('Wschowa accepts the official explicit empty response for each active asset stream', async () => {
  const result = await crawlWschowa({ getPage: async () => fixture('wschowa') });
  assert.deepEqual(result.listings, []);
  assert.deepEqual(result.land, []);
  assert.equal(result.valid_empty, true);
  assert.equal(result.valid_empty_land, true);
});

test('Wschowa never treats a missing, wrong, changed or unparsed board as empty', async () => {
  for (const html of [
    null, '<h1>Service unavailable</h1>',
    fixture('wschowa').replace('aria-selected="true"', 'aria-selected="false"'),
    fixture('wschowa').replace('Brak informacji spełniających kryteria.', 'Loading...'),
    fixture('wschowa') + '<tr class="odd"><td>Unparsed sale</td></tr>',
    fixture('wschowa') + '<a href="/przetargi/29/999/sprzedaz/">Sale</a>',
  ]) {
    const result = await crawlWschowa({ getPage: async () => html });
    assert.equal(result.valid_empty, false);
    assert.equal(result.valid_empty_land, false);
  }
});

test('Żagań confirms a complete lease-only board without importing a rental as a sale', async () => {
  assert.equal(parseBoardPage(fixture('zagan')).length, 1);
  const result = await crawlZagan({ getPage: async () => fixture('zagan') });
  assert.deepEqual(result.listings, []);
  assert.deepEqual(result.land, []);
  assert.equal(result.valid_empty, true);
  assert.equal(result.valid_empty_land, true);
});

test('Żagań rejects empty proof after fetch/layout/asset/parse failures', async () => {
  for (const html of [
    null, '<h1>Service unavailable</h1>',
    fixture('zagan').replace('aria-selected="true"', 'aria-selected="false"'),
    fixture('zagan').replace(/class="td-title-1"/g, 'class="changed"'),
    fixture('zagan').replace('ODDANIA W DZIERŻAWĘ', 'SPRZEDAŻ BUDYNKU'),
    fixture('zagan').replace('ODDANIA W DZIERŻAWĘ', 'SPRZEDAŻ LOKALU MIESZKALNEGO'),
  ]) {
    const result = await crawlZagan({ getPage: async () => html });
    assert.equal(result.valid_empty, false);
    assert.equal(result.valid_empty_land, false);
  }
});

test('Żagań pagination failure cannot confirm an empty stream from the first page', async () => {
  const html = fixture('zagan');
  const row = /<tr class="odd">[\s\S]*?<\/tr>/i.exec(html)[0];
  const fullPage = html.replace(row, Array.from({ length: 10 }, (_, i) => row.replace('/681/', `/${681 + i}/`)).join('\n'));
  let requests = 0;
  const result = await crawlZagan({ getPage: async () => ++requests === 1 ? fullPage : null });
  assert.equal(requests, 2);
  assert.equal(result.valid_empty, false);
  assert.equal(result.valid_empty_land, false);
});

test('Żagań rejects a partially changed table even when one lease row still parses', async () => {
  const html = fixture('zagan');
  const row = /<tr class="odd">[\s\S]*?<\/tr>/i.exec(html)[0];
  const changedRow = row.replace('class="odd"', 'class="new-layout"').replace('ODDANIA W DZIERŻAWĘ', 'SPRZEDAŻ LOKALU MIESZKALNEGO');
  const result = await crawlZagan({ getPage: async () => html.replace(row, row + changedRow) });
  assert.equal(result.valid_empty, false);
  assert.equal(result.valid_empty_land, false);
});

test('Żagań follows an explicit next page even when the source returns fewer than ten rows', async () => {
  const html = fixture('zagan') + '<a href="/przetargi/344/2/status/0/">2</a>';
  let requests = 0;
  const result = await crawlZagan({ getPage: async () => ++requests === 1 ? html : null });
  assert.equal(requests, 2);
  assert.equal(result.valid_empty, false);
});
