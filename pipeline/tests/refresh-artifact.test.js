import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, truncateSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { applyCityArtifacts, applyProviderArtifacts } from '../scripts/refresh-artifact.js';

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fixture(path = 'data/test-city/meta.json', content = '{"city":"test-city"}\n') {
  const root = mkdtempSync(join(tmpdir(), 'refresh-artifact-'));
  const repo = join(root, 'repo');
  const incoming = join(root, 'incoming');
  const artifact = join(incoming, 'refresh-result-test-city');
  const bytes = Buffer.from(content);
  mkdirSync(join(artifact, 'files', ...path.split('/').slice(0, -1)), { recursive: true });
  mkdirSync(repo, { recursive: true });
  writeFileSync(join(artifact, 'files', ...path.split('/')), bytes);
  writeFileSync(join(artifact, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    kind: 'city',
    id: 'test-city',
    status: 'ready',
    files: [{ path, size: bytes.length, sha256: hash(bytes) }],
  }));
  return { repo, incoming, artifact, path };
}

test('publisher validates and applies a city artifact', () => {
  const f = fixture();
  const result = applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] });
  assert.deepEqual(result.ready, ['test-city']);
  assert.deepEqual(result.staged, [f.path]);
  assert.equal(readFileSync(join(f.repo, f.path), 'utf8'), '{"city":"test-city"}\n');
});

test('publisher rejects traversal and paths outside the city allowlist', () => {
  const f = fixture('data/test-city/meta.json');
  const manifestPath = join(f.artifact, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files[0].path = '../SECURITY.md';
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(
    () => applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] }),
    /unsafe path component/,
  );
});

test('publisher rejects a symlink in an artifact', () => {
  const f = fixture();
  const file = join(f.artifact, 'files', ...f.path.split('/'));
  writeFileSync(join(f.artifact, 'target.json'), '{}');
  unlinkSync(file);
  symlinkSync(join(f.artifact, 'target.json'), file);
  assert.throws(
    () => applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] }),
    /not a regular file|symlink/,
  );
});

test('publisher rejects an oversized artifact file', () => {
  const f = fixture();
  const file = join(f.artifact, 'files', ...f.path.split('/'));
  truncateSync(file, 8 * 1024 * 1024 + 1);
  assert.throws(
    () => applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] }),
    /file exceeds/,
  );
});

test('publisher rejects hash, size and JSON failures', () => {
  for (const mutation of ['hash', 'size', 'json']) {
    const f = fixture();
    const manifestPath = join(f.artifact, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (mutation === 'hash') manifest.files[0].sha256 = '0'.repeat(64);
    if (mutation === 'size') manifest.files[0].size += 1;
    if (mutation === 'json') {
      const file = join(f.artifact, 'files', ...f.path.split('/'));
      writeFileSync(file, '{');
      manifest.files[0].size = 1;
      manifest.files[0].sha256 = hash(Buffer.from('{'));
    }
    writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(
      () => applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] }),
      /mismatch|malformed JSON/,
    );
  }
});

test('publisher rejects missing, extra and conflicting artifact files', () => {
  const f = fixture();
  writeFileSync(join(f.artifact, 'unexpected.txt'), 'unexpected');
  assert.throws(
    () => applyCityArtifacts({ repoRoot: f.repo, incomingRoot: f.incoming, expectedCities: ['test-city'] }),
    /undeclared file/,
  );
});

test('provider publisher requires and applies the primary artifact', () => {
  const root = mkdtempSync(join(tmpdir(), 'provider-artifact-'));
  const repo = join(root, 'repo');
  const incoming = join(root, 'incoming');
  const artifact = join(incoming, 'provider-result-primary');
  const path = 'data/providers/amw/meta.json';
  const bytes = Buffer.from('{"provider":"amw"}\n');
  mkdirSync(join(artifact, 'files', 'data/providers/amw'), { recursive: true });
  mkdirSync(repo, { recursive: true });
  writeFileSync(join(artifact, 'files', path), bytes);
  writeFileSync(join(artifact, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    kind: 'provider',
    id: 'primary',
    status: 'ready',
    files: [{ path, size: bytes.length, sha256: hash(bytes) }],
  }));

  const result = applyProviderArtifacts({ repoRoot: repo, incomingRoot: incoming });
  assert.deepEqual(result.ready, ['primary']);
  assert.deepEqual(result.staged, [path]);

  const missing = mkdtempSync(join(tmpdir(), 'provider-artifact-missing-'));
  assert.throws(
    () => applyProviderArtifacts({ repoRoot: repo, incomingRoot: missing }),
    /primary provider artifact is missing/,
  );
});
