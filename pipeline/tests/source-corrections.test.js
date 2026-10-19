import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SOURCE_CORRECTIONS } from '../src/core/source-corrections-data.js';
import { applySourceCorrections } from '../src/core/source-corrections.js';

test('historical corrections identify the committed source bytes', () => {
  for (const rule of SOURCE_CORRECTIONS) {
    const bytes = readFileSync(new URL('../' + rule.source_cache, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), rule.source_sha256, rule.url);
  }
});

test('Gorzów repair restores the actual starting price and explicit unsold outcome', () => {
  const rule = SOURCE_CORRECTIONS.find((row) => row.city === 'gorzow-wielkopolski'
    && row.changes.starting_price_pln?.to === 230000);
  const input = [{ key: rule.key, area_m2: 37.3, listings: [{ date: rule.date,
    source_pdf: rule.url, starting_price_pln: 2504, final_price_pln: 230000, outcome: 'sold' }] }];
  const [repaired] = applySourceCorrections(input, rule.city);
  assert.equal(repaired.listings[0].starting_price_pln, 230000);
  assert.equal(repaired.listings[0].final_price_pln, null);
  assert.equal(repaired.listings[0].outcome, 'unsold');
  assert.equal(repaired.area_m2, 37.3);
  const newer = [{ key: rule.key, listings: [{ date: rule.date, source_pdf: rule.url,
    starting_price_pln: 240000, final_price_pln: 250000, outcome: 'sold' }] }];
  assert.deepEqual(applySourceCorrections(structuredClone(newer), rule.city), newer);
});

test('an identity correction moves only its source auction and retains the other history', () => {
  const rule = SOURCE_CORRECTIONS.find((row) => row.identity);
  const valid = { date: '2020-01-01', starting_price_pln: 100000, source_pdf: 'https://example.test/other' };
  const erroneous = { date: rule.date, source_pdf: rule.url, starting_price_pln: 210170000 };
  const rows = applySourceCorrections([{ key: rule.key, area_m2: 26.13, listings: [valid, erroneous] }], rule.city);
  assert.deepEqual(rows.find((row) => row.key === rule.key).listings, [valid]);
  const corrected = rows.find((row) => row.key === 'l wyczolkowskiego|3-5|7');
  assert.equal(corrected.listings[0].starting_price_pln, 170000);
  assert.deepEqual(corrected.legacy_keys, [rule.key]);
  assert.equal(corrected.area_m2, 26.13);
});

test('a confirmed rental exclusion removes its notice while preserving an actual sale', () => {
  const rule = SOURCE_CORRECTIONS.find(row => row.exclude);
  const sale = { date: '2020-01-01', source_pdf: 'https://example.test/sale', outcome: 'sold', final_price_pln: 7000 };
  const lease = { date: rule.date, detail_url: rule.url, outcome: 'sold', final_price_pln: 800 };
  const rows = applySourceCorrections([{ key: rule.key, listings: [sale, lease] }], rule.city);
  assert.deepEqual(rows[0].listings, [sale]);
});
