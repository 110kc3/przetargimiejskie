import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTerytId, resolveTerytId } from '../src/core/uldk.js';

test('pickTerytId: single result line', () => {
  assert.equal(pickTerytId('1\n246101_1.0032.290/96'), '246101_1.0032.290/96');
});

test('pickTerytId: filters ambiguous results to the expected gmina', () => {
  const resp = '6\n061103_2.0009.1\n246101_1.0032.290/96\n140203_5.0010.1';
  assert.equal(pickTerytId(resp, '246101_1'), '246101_1.0032.290/96');
  assert.equal(pickTerytId(resp, '999999_9'), null); // none in gmina → null, never guess
});

test('pickTerytId: ambiguous (multi) with no gmina filter → null', () => {
  assert.equal(pickTerytId('2\n246101_1.0001.1\n246601_1.0002.1'), null);
});

test('pickTerytId: empty / status-only → null', () => {
  assert.equal(pickTerytId('0'), null);
  assert.equal(pickTerytId(''), null);
});

test('resolveTerytId: construct+verify by id when the obręb carries a number', async () => {
  // The placeholder-name case: obręb "11 Sosnowiec" — "Sosnowiec" is no real
  // obręb name, so the name search can never match. Strategy 1 builds the full
  // id from the zero-padded code (0011) + gmina + parcel and verifies it.
  let url = null;
  const fakeFetch = async (u) => { url = u; return { ok: true, text: async () => '1\n247501_1.0011.3278' }; };
  const id = await resolveTerytId({ obreb: '11 Sosnowiec', parcel: '3278', terytGmina: '247501_1' }, { fetchImpl: fakeFetch });
  assert.equal(id, '247501_1.0011.3278');
  assert.ok(/GetParcelById\b/.test(url) && !/IdOrNr/.test(url), 'used GetParcelById, not the name search');
  assert.ok(/247501_1\.0011\.3278/.test(decodeURIComponent(url)), 'constructed full id with zero-padded obręb code');
});

test('resolveTerytId: falls back to the obręb NAME search when the id misses', async () => {
  // Strategy 1 (GetParcelById) returns no match → Strategy 2 searches by name,
  // stripping the leading obręb number. Verifies the name path still works.
  let nameUrl = null;
  const fakeFetch = async (u) => {
    if (/GetParcelById\b/.test(u) && !/IdOrNr/.test(u)) return { ok: true, text: async () => '-1 brak wyników' };
    nameUrl = u;
    return { ok: true, text: async () => '1\n247001_1.0001.AR_4.2684/248' };
  };
  const id = await resolveTerytId({ obreb: '0001 Brzezinka', parcel: '2684/248', terytGmina: '247001_1' }, { fetchImpl: fakeFetch });
  assert.equal(id, '247001_1.0001.AR_4.2684/248');
  assert.ok(/Brzezinka%202684/.test(nameUrl), 'number prefix stripped from the obręb name query');
});

test('resolveTerytId: name-only obręb (no number) goes straight to the name search', async () => {
  let url = null;
  const fakeFetch = async (u) => { url = u; return { ok: true, text: async () => '1\n247501_1.0005.123/4' }; };
  const id = await resolveTerytId({ obreb: 'Kazimierz', parcel: '123/4', terytGmina: '247501_1' }, { fetchImpl: fakeFetch });
  assert.equal(id, '247501_1.0005.123/4');
  assert.ok(/GetParcelByIdOrNr/.test(url), 'no numeric code → name search only');
});

test('resolveTerytId: missing inputs / network error → null (defensive)', async () => {
  assert.equal(await resolveTerytId({ obreb: '', parcel: '1' }), null);
  assert.equal(await resolveTerytId({}), null);
  const failFetch = async () => { throw new Error('down'); };
  assert.equal(await resolveTerytId({ obreb: 'X', parcel: '1' }, { fetchImpl: failFetch }), null);
});
