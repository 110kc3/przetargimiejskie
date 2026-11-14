import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isInRefreshCohort, selectRefreshCohort } from '../src/refresh-cohort.js';

function dataDirWithPublished(...cityIds) {
  const dataDir = mkdtempSync(join(tmpdir(), 'cohort-'));
  for (const id of cityIds) {
    mkdirSync(join(dataDir, id));
    writeFileSync(join(dataDir, id, 'meta.json'), '{}');
  }
  return dataDir;
}

test('published cities stay in the refresh cohort', () => {
  const dataDir = dataDirWithPublished('gliwice');
  assert.equal(isInRefreshCohort('gliwice', { dataDir, onboarding: new Set() }), true);
});

test('registered cities that never published are outside the cohort', () => {
  const dataDir = dataDirWithPublished('gliwice');
  assert.equal(isInRefreshCohort('mogilno', { dataDir, onboarding: new Set() }), false);
});

test('an onboarding city joins the cohort before its first publication', () => {
  const dataDir = dataDirWithPublished();
  assert.equal(isInRefreshCohort('mogilno', { dataDir, onboarding: new Set(['mogilno']) }), true);
});

test('selection keeps registry order and drops unpublished cities', () => {
  const dataDir = dataDirWithPublished('a', 'c');
  const registry = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const selected = selectRefreshCohort(registry, { dataDir, onboarding: new Set() });
  assert.deepEqual(selected.map((city) => city.id), ['a', 'c']);
});
