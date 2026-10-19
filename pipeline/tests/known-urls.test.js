import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadKnownSourceUrls } from '../src/core/known-urls.js';

test('mixed-stream known URLs include land only for opted-in callers', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'known-source-urls-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await mkdir(join(dataDir, 'example'));
  await writeFile(join(dataDir, 'example', 'properties.json'), JSON.stringify({ properties: [{ listings: [
    { source_pdf: 'property-result', source_url: 'property-source', detail_url: 'property-detail', pdf_url: 'property-pdf' },
  ] }] }));
  await writeFile(join(dataDir, 'example', 'land.json'), JSON.stringify({ plots: [{ listings: [
    { source_pdf: 'land-result', source_url: 'land-source', detail_url: 'land-detail', pdf_url: 'land-pdf' },
  ] }] }));
  const legacy = await loadKnownSourceUrls('example', { dataDir });
  assert.deepEqual([...legacy].sort(), ['property-detail', 'property-pdf', 'property-result', 'property-source']);
  const mixed = await loadKnownSourceUrls('example', { dataDir, includeLand: true });
  assert.equal(mixed.size, 8);
  assert.equal(mixed.has('land-detail'), true);
});

test('one unreadable history stream does not erase the other stream’s known URLs', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'known-source-urls-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await mkdir(join(dataDir, 'example'));
  await writeFile(join(dataDir, 'example', 'properties.json'), '{broken');
  await writeFile(join(dataDir, 'example', 'land.json'), JSON.stringify({ plots: [{ listings: [{ detail_url: 'land-detail' }] }] }));
  assert.deepEqual([...await loadKnownSourceUrls('example', { dataDir, includeLand: true })], ['land-detail']);
  await writeFile(join(dataDir, 'example', 'properties.json'), JSON.stringify({ properties: [{ listings: [{ detail_url: 'property-detail' }] }] }));
  await writeFile(join(dataDir, 'example', 'land.json'), '{broken');
  assert.deepEqual([...await loadKnownSourceUrls('example', { dataDir, includeLand: true })], ['property-detail']);
  assert.equal((await loadKnownSourceUrls('missing', { dataDir, includeLand: true })).size, 0);
});

test('result discovery revisits archived announcements so later result attachments are not skipped', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'known-source-urls-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await mkdir(join(dataDir, 'example'));
  const listings = [
    { outcome: 'active', detail_url: 'current' },
    { outcome: 'archived', detail_url: 'past-announcement' },
    { outcome: 'sold', detail_url: 'sold-result' },
    { outcome: 'unsold', detail_url: 'unsold-result' },
    { outcome: 'no_winner', detail_url: 'no-winner-result' },
  ];
  await writeFile(join(dataDir, 'example', 'properties.json'), JSON.stringify({ properties: [{ listings }] }));
  await writeFile(join(dataDir, 'example', 'land.json'), JSON.stringify({ plots: [{ listings: [
    { outcome: 'archived', detail_url: 'land-announcement' },
    { outcome: 'sold', detail_url: 'land-result' },
  ] }] }));
  const resolved = await loadKnownSourceUrls('example', { dataDir, includeLand: true, resolvedOnly: true });
  assert.deepEqual([...resolved].sort(), ['land-result', 'no-winner-result', 'sold-result', 'unsold-result']);
  assert.equal((await loadKnownSourceUrls('example', { dataDir })).has('past-announcement'), true, 'legacy callers retain their existing lookup behavior');
});
