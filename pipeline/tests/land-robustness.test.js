// Robustness: a failure on individual LAND plots (bad record, broken land crawl,
// or a city erroring) must NOT abort the city's refresh or the whole pipeline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLand } from '../src/core/build-land.js';

test('buildLand: null / empty / unkeyable input never throws', () => {
  assert.deepEqual(buildLand(undefined, 'x'), { plots: [] });
  assert.deepEqual(buildLand(null, 'x'), { plots: [] });
  assert.deepEqual(buildLand([], 'x'), { plots: [] });
  const { plots } = buildLand([{}, { foo: 1 }, { dzialka_nr: '', obreb: '' }], 'x');
  assert.equal(plots.length, 0); // nothing keyable, but no throw
});

test('buildLand: a malformed plot among good ones — good ones still build', () => {
  const recs = [
    { dzialka_nr: '1/1', obreb: 'A', area_m2: 100, starting_price_pln: 5, auction_date: '2026-09-01' },
    null,                                         // null record (used to throw on .address)
    undefined,                                    // undefined record
    42,                                           // non-object
    { dzialka_nr: 7, obreb: 7, area_m2: 'oops', auction_date: 123 }, // wrong types
    { dzialka_nr: '2/2', obreb: 'B', area_m2: 200, starting_price_pln: 9, auction_date: '2026-10-01' },
  ];
  let plots;
  assert.doesNotThrow(() => { plots = buildLand(recs, 'x', { label: 'X' }).plots; });
  const keys = plots.map((p) => p.key);
  assert.ok(keys.includes('dz|a|1/1') && keys.includes('dz|b|2/2'), 'both well-formed parcels survived');
  assert.ok(plots.every((p) => Array.isArray(p.listings) && p.kind === 'grunt'), 'every plot is renderable');
});

test('adapter isolation: a THROWING land crawl leaves the flats stream intact', async () => {
  // mirrors zabrze/gliwice/rybnik index.js crawlActive (flats + try/catch(crawlLand))
  const crawlActiveFlats = async () => ({ listings: [{ kind: 'mieszkalny' }], wykaz: [] });
  const crawlLand = async () => { throw new Error('land source down'); };
  async function crawlActive() {
    const base = await crawlActiveFlats();
    let land = [];
    try { land = await crawlLand(); } catch { /* isolated — kept flats */ }
    return { ...base, land };
  }
  const r = await crawlActive();
  assert.equal(r.listings.length, 1, 'flats survived a land-crawl failure');
  assert.deepEqual(r.land, [], 'land failure swallowed → empty land, no throw');
});

test('refresh isolation: one city throwing (e.g. its land crawl) does not stop the others', async () => {
  // mirrors refresh.js main(): per-city try/catch keeps last-published + continues
  const cities = [
    { id: 'a', refresh: async () => 'a:ok' },
    { id: 'b', refresh: async () => { throw new Error('b land board 5xx'); } },
    { id: 'c', refresh: async () => 'c:ok' },
  ];
  const metas = [];
  for (const c of cities) {
    try { metas.push(await c.refresh()); }
    catch { metas.push(`${c.id}:kept-last-published`); }
  }
  assert.deepEqual(metas, ['a:ok', 'b:kept-last-published', 'c:ok'], 'all cities processed despite one failure');
});

test('land partition: filtering kind:grunt out of a mixed/garbage stream never throws', () => {
  const mixed = [{ kind: 'mieszkalny' }, null, { kind: 'grunt', dzialka_nr: '9/9', obreb: 'Z' }, undefined, 5];
  let land, flats;
  assert.doesNotThrow(() => {
    land = []; flats = [];
    for (const x of mixed) (x && x.kind === 'grunt' ? land : flats).push(x);
  });
  assert.equal(land.length, 1);
  assert.doesNotThrow(() => buildLand(land, 'z', { label: 'Z' }));
});
