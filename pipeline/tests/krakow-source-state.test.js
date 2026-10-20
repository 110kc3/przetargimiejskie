import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { harvestNewsIds, crawlAll } from '../src/cities/krakow/crawl.js';

const fixture = name => readFileSync(new URL(`./fixtures/remediation/${name}`, import.meta.url), 'utf8');
const current = fixture('krakow-board-30626.html');
const archive = fixture('krakow-board-102895.html');
const board = (id, news, next = null, page = 1) => `<form action="/?dok_id=${id}&amp;strona=${page}"></form>
  <a href="/?news_id=${news}">Notice</a>
  ${next ? `<a href="/?dok_id=${id}&amp;strona=${next}">Next</a>` : ''}`;

test('real current board starts at page one and stops without a pager', async () => {
  const requests = [];
  const ids = await harvestNewsIds(['?dok_id=30626'], { fetchText: async url => {
    requests.push(url);
    assert.ok(url.endsWith('&strona=1'));
    return current;
  } });
  assert.deepEqual([...ids], ['263185']);
  assert.equal(ids.complete, true);
  assert.equal(requests.length, 1);
});

test('real archive pager exposes further history beyond the configured bound', async () => {
  const ids = await harvestNewsIds(['?dok_id=102895'], { maxPages: 1, fetchText: async () => archive });
  assert.equal(ids.length, 10);
  assert.equal(ids.complete, false);
});

test('explicit next pages are fetched and a missing/looping page stays incomplete', async () => {
  for (const failure of ['fetch', 'repeat', 'markup']) {
    const ids = await harvestNewsIds(['?dok_id=102895'], { fetchText: async url => {
      if (url.endsWith('strona=1')) return board('102895', '100', 2);
      if (failure === 'fetch') throw Error('source unavailable');
      return failure === 'repeat' ? board('102895', '100', 2) : '<html>Service unavailable</html>';
    } });
    assert.deepEqual([...ids], ['100']);
    assert.equal(ids.complete, false);
  }
  const ids = await harvestNewsIds(['?dok_id=102895'], { fetchText: async url =>
    url.endsWith('strona=1') ? board('102895', '100', 2) : board('102895', '101', null, 2) });
  assert.deepEqual([...ids], ['100', '101']);
  assert.equal(ids.complete, true);
});

test('an empty form or failed result detail cannot establish complete result coverage', async () => {
  const empty = await harvestNewsIds(['?dok_id=30630'], { fetchText: async () => '<form action="/?dok_id=30630"></form>' });
  assert.equal(empty.complete, false);
  const broken = await harvestNewsIds(['?dok_id=30630'], { fetchText: async () => '<form action="https://["></form>' });
  assert.equal(broken.complete, false);
  const result = await crawlAll({ fetchText: async url => {
    const id = new URL(url).searchParams.get('dok_id');
    if (!id) throw Error('detail unavailable');
    return board(id, '100');
  } });
  assert.equal(result.resultRefs.complete, false);
  assert.equal(result.resultRefs.length, 0);
});
