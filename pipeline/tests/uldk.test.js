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

test('resolveTerytId: queries by name (strips obręb-number prefix), injectable fetch', async () => {
  let url = null;
  const fakeFetch = async (u) => { url = u; return { ok: true, text: async () => '1\n247001_1.0001.AR_4.2684/248' }; };
  const id = await resolveTerytId({ obreb: '0001 Brzezinka', parcel: '2684/248', terytGmina: '247001_1' }, { fetchImpl: fakeFetch });
  assert.equal(id, '247001_1.0001.AR_4.2684/248');
  assert.ok(/Brzezinka%202684/.test(url), 'number prefix stripped from the obręb query');
});

test('resolveTerytId: missing inputs / network error → null (defensive)', async () => {
  assert.equal(await resolveTerytId({ obreb: '', parcel: '1' }), null);
  assert.equal(await resolveTerytId({}), null);
  const failFetch = async () => { throw new Error('down'); };
  assert.equal(await resolveTerytId({ obreb: 'X', parcel: '1' }, { fetchImpl: failFetch }), null);
});
