#!/usr/bin/env node

import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_FILES = 1_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const CITY_FILES = new Set(['active.json', 'land.json', 'meta.json', 'properties.json']);
const PROVIDER_FILES = new Set([
  'data/providers/amw/listings.json',
  'data/providers/amw/meta.json',
  'data/providers/pkp/listings.json',
  'data/providers/pkp/meta.json',
]);
const HASHED_CACHE = /^pipeline\/(?:ocr-cache|pdf-text-cache|doc-text-cache|rtf-text-cache|detail-cache)\/[^/]+\.[0-9a-f]{8}\.(?:txt|json)$/;
const ULDK_CACHE = /^pipeline\/uldk-cache\/[a-z0-9-]+\.json$/;

function fail(message) {
  throw new Error(`refresh artifact rejected: ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertId(value, label) {
  if (!/^[a-z0-9-]+$/.test(value || '')) fail(`invalid ${label}: ${value}`);
}

function assertSafeRelativePath(path) {
  if (!path || path.includes('\\') || path.startsWith('/') || path.includes('\0')) {
    fail(`unsafe path: ${JSON.stringify(path)}`);
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    fail(`unsafe path component: ${path}`);
  }
}

function allowedCityPath(path, city) {
  const prefix = `data/${city}/`;
  return (path.startsWith(prefix) && CITY_FILES.has(path.slice(prefix.length)))
    || HASHED_CACHE.test(path)
    || ULDK_CACHE.test(path);
}

function allowedProviderPath(path) {
  return PROVIDER_FILES.has(path) || /^pipeline\/ocr-cache\/[^/]+\.[0-9a-f]{8}\.txt$/.test(path);
}

function assertRegularFile(root, path) {
  assertSafeRelativePath(path);
  const absolute = resolve(root, ...path.split('/'));
  const prefix = `${resolve(root)}${sep}`;
  if (!absolute.startsWith(prefix)) fail(`path escapes root: ${path}`);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`not a regular file: ${path}`);
  if (stat.size > MAX_FILE_BYTES) fail(`file exceeds ${MAX_FILE_BYTES} bytes: ${path}`);
  return { absolute, stat };
}

function assertNoSymlinkParents(root, path) {
  let current = resolve(root);
  for (const part of path.split('/').slice(0, -1)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) fail(`symlink parent: ${path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      break;
    }
  }
}

function changedFiles(repoRoot, roots) {
  const output = execFileSync(
    'git',
    ['ls-files', '-m', '-o', '--exclude-standard', '-z', '--', ...roots],
    { cwd: repoRoot },
  );
  return output.toString('utf8').split('\0').filter(Boolean).sort();
}

export function packArtifact({ repoRoot, outRoot, kind, id, status, metrics = null }) {
  if (!['city', 'provider'].includes(kind)) fail(`invalid kind: ${kind}`);
  assertId(id, 'artifact id');
  if (!['ready', 'failed'].includes(status)) fail(`invalid status: ${status}`);
  mkdirSync(outRoot, { recursive: false });

  const roots = kind === 'city'
    ? [`data/${id}`, 'pipeline/ocr-cache', 'pipeline/pdf-text-cache', 'pipeline/doc-text-cache', 'pipeline/rtf-text-cache', 'pipeline/detail-cache', 'pipeline/uldk-cache']
    : ['data/providers/amw', 'data/providers/pkp', 'pipeline/ocr-cache'];
  const candidates = status === 'ready' ? changedFiles(repoRoot, roots) : [];
  if (candidates.length > MAX_FILES) fail(`too many files: ${candidates.length}`);

  let totalBytes = 0;
  const files = [];
  for (const path of candidates) {
    const allowed = kind === 'city' ? allowedCityPath(path, id) : allowedProviderPath(path);
    if (!allowed) fail(`path is outside the ${kind} allowlist: ${path}`);
    const { absolute, stat } = assertRegularFile(repoRoot, path);
    totalBytes += stat.size;
    if (totalBytes > MAX_TOTAL_BYTES) fail(`artifact exceeds ${MAX_TOTAL_BYTES} bytes`);
    const bytes = readFileSync(absolute);
    if (path.endsWith('.json')) {
      try { JSON.parse(bytes.toString('utf8')); }
      catch { fail(`malformed JSON: ${path}`); }
    }
    const destination = join(outRoot, 'files', ...path.split('/'));
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(absolute, destination);
    files.push({ path, size: stat.size, sha256: sha256(bytes) });
  }

  if (metrics && (!Number.isSafeInteger(metrics.duration_ms) || metrics.duration_ms < 0
      || !Number.isSafeInteger(metrics.request_count) || metrics.request_count < 0
      || typeof metrics.attempted_at !== 'string'
      || Number.isNaN(Date.parse(metrics.attempted_at)))) {
    fail(`invalid metrics for ${id}`);
  }
  writeFileSync(join(outRoot, 'manifest.json'), `${JSON.stringify({
    schema_version: 1,
    kind,
    id,
    status,
    files,
    ...(metrics ? { metrics } : {}),
  }, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
  return files.map((file) => file.path);
}

function walkRegularFiles(root, current = root, found = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink()) fail(`symlink in artifact: ${relative(root, absolute)}`);
    if (entry.isDirectory()) walkRegularFiles(root, absolute, found);
    else if (entry.isFile()) found.push(relative(root, absolute).split(sep).join('/'));
    else fail(`special file in artifact: ${relative(root, absolute)}`);
  }
  return found;
}

function readManifest(artifactRoot, expectedKind, expectedId) {
  const manifestPath = join(artifactRoot, 'manifest.json');
  let manifest;
  try {
    const stat = lstatSync(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_MANIFEST_BYTES) {
      fail(`invalid manifest file for ${expectedId}`);
    }
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  }
  catch { fail(`missing or malformed manifest for ${expectedId}`); }
  if (manifest.schema_version !== 1 || manifest.kind !== expectedKind || manifest.id !== expectedId) {
    fail(`manifest identity mismatch for ${expectedId}`);
  }
  if (!['ready', 'failed'].includes(manifest.status) || !Array.isArray(manifest.files)) {
    fail(`invalid manifest fields for ${expectedId}`);
  }
  if (manifest.metrics && (!Number.isSafeInteger(manifest.metrics.duration_ms)
      || manifest.metrics.duration_ms < 0 || !Number.isSafeInteger(manifest.metrics.request_count)
      || manifest.metrics.request_count < 0 || typeof manifest.metrics.attempted_at !== 'string'
      || Number.isNaN(Date.parse(manifest.metrics.attempted_at)))) {
    fail(`invalid manifest metrics for ${expectedId}`);
  }
  if (manifest.status === 'failed' && manifest.files.length !== 0) {
    fail(`failed artifact contains files for ${expectedId}`);
  }
  return manifest;
}

function validateAndApply({ repoRoot, artifactRoot, manifest, allowPath, seen, staged }) {
  if (manifest.files.length > MAX_FILES) fail(`too many files for ${manifest.id}`);
  const declared = new Set();
  let totalBytes = 0;

  for (const record of manifest.files) {
    if (!record || typeof record.path !== 'string' || !Number.isSafeInteger(record.size)
        || record.size < 0 || !/^[0-9a-f]{64}$/.test(record.sha256 || '')) {
      fail(`invalid file record for ${manifest.id}`);
    }
    assertSafeRelativePath(record.path);
    if (!allowPath(record.path)) fail(`path is outside the ${manifest.kind} allowlist: ${record.path}`);
    if (declared.has(record.path)) fail(`duplicate path in manifest: ${record.path}`);
    declared.add(record.path);

    const artifactPath = `files/${record.path}`;
    const { absolute, stat } = assertRegularFile(artifactRoot, artifactPath);
    if (stat.size !== record.size) fail(`size mismatch: ${record.path}`);
    totalBytes += stat.size;
    if (totalBytes > MAX_TOTAL_BYTES) fail(`artifact exceeds ${MAX_TOTAL_BYTES} bytes`);
    const bytes = readFileSync(absolute);
    if (sha256(bytes) !== record.sha256) fail(`hash mismatch: ${record.path}`);
    if (record.path.endsWith('.json')) {
      try { JSON.parse(bytes.toString('utf8')); }
      catch { fail(`malformed JSON: ${record.path}`); }
    }

    const priorHash = seen.get(record.path);
    if (priorHash && priorHash !== record.sha256) fail(`conflicting duplicate path: ${record.path}`);
    if (priorHash) continue;
    seen.set(record.path, record.sha256);

    assertNoSymlinkParents(repoRoot, record.path);
    const destination = resolve(repoRoot, ...record.path.split('/'));
    try {
      if (lstatSync(destination).isSymbolicLink()) fail(`symlink destination: ${record.path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(absolute, destination);
    staged.add(record.path);
  }

  const actual = new Set(walkRegularFiles(artifactRoot));
  const expected = new Set(['manifest.json', ...[...declared].map((path) => `files/${path}`)]);
  for (const path of actual) if (!expected.has(path)) fail(`undeclared file: ${path}`);
  for (const path of expected) if (!actual.has(path)) fail(`declared file missing: ${path}`);
}

export function applyCityArtifacts({ repoRoot, incomingRoot, expectedCities }) {
  const expected = [...expectedCities].sort();
  if (new Set(expected).size !== expected.length) fail('duplicate expected city');
  expected.forEach((city) => assertId(city, 'city'));
  const rootEntries = readdirSync(incomingRoot, { withFileTypes: true });
  if (rootEntries.some((entry) => !entry.isDirectory())) fail('unexpected non-directory entry in city artifact set');
  const actualDirs = rootEntries.map((entry) => entry.name).sort();
  const expectedDirs = expected.map((city) => `refresh-result-${city}`);
  if (JSON.stringify(actualDirs) !== JSON.stringify(expectedDirs)) {
    fail(`artifact set mismatch (expected ${expectedDirs.join(', ')}, got ${actualDirs.join(', ')})`);
  }

  const seen = new Map();
  const staged = new Set();
  const ready = [];
  const outcomes = [];
  for (const city of expected) {
    const artifactRoot = join(incomingRoot, `refresh-result-${city}`);
    const manifest = readManifest(artifactRoot, 'city', city);
    validateAndApply({
      repoRoot,
      artifactRoot,
      manifest,
      allowPath: (path) => allowedCityPath(path, city),
      seen,
      staged,
    });
    if (manifest.status === 'ready') ready.push(city);
    outcomes.push({ id: city, status: manifest.status, metrics: manifest.metrics || null });
  }
  return { ready, staged: [...staged].sort(), outcomes };
}

export function applyProviderArtifacts({ repoRoot, incomingRoot }) {
  const order = ['primary', 'retry-1', 'retry-2'];
  const actualDirs = readdirSync(incomingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('provider-result-'))
    .map((entry) => entry.name);
  if (!actualDirs.includes('provider-result-primary')) fail('primary provider artifact is missing');
  if (actualDirs.some((name) => !order.some((id) => name === `provider-result-${id}`))) {
    fail('unexpected provider artifact');
  }

  const seen = new Map();
  const staged = new Set();
  const ready = [];
  for (const id of order) {
    const artifactRoot = join(incomingRoot, `provider-result-${id}`);
    if (!actualDirs.includes(`provider-result-${id}`)) continue;
    const manifest = readManifest(artifactRoot, 'provider', id);
    validateAndApply({ repoRoot, artifactRoot, manifest, allowPath: allowedProviderPath, seen, staged });
    if (manifest.status === 'ready') ready.push(id);
  }
  return { ready, staged: [...staged].sort() };
}

function writeLines(path, lines) {
  writeFileSync(path, lines.length ? `${lines.join('\n')}\n` : '', 'utf8');
}

function usage() {
  console.error('usage: refresh-artifact.js pack-city <city> <ready|failed> <out> | pack-provider <id> <ready|failed> <out> | apply-city <incoming> <expected-json> <ready-out> <paths-out> [outcomes-out] | apply-provider <incoming> <ready-out> <paths-out>');
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'pack-city' && args.length === 3) {
      packArtifact({ repoRoot: SCRIPT_ROOT, kind: 'city', id: args[0], status: args[1], outRoot: resolve(args[2]) });
    } else if (command === 'pack-provider' && args.length === 3) {
      packArtifact({ repoRoot: SCRIPT_ROOT, kind: 'provider', id: args[0], status: args[1], outRoot: resolve(args[2]) });
    } else if (command === 'apply-city' && (args.length === 4 || args.length === 5)) {
      const expectedCities = JSON.parse(args[1]);
      if (!Array.isArray(expectedCities)) fail('expected city JSON is not an array');
      const result = applyCityArtifacts({ repoRoot: SCRIPT_ROOT, incomingRoot: resolve(args[0]), expectedCities });
      writeLines(args[2], result.ready);
      writeLines(args[3], result.staged);
      if (args[4]) writeFileSync(args[4], `${JSON.stringify(result.outcomes, null, 2)}\n`, 'utf8');
    } else if (command === 'apply-provider' && args.length === 3) {
      const result = applyProviderArtifacts({ repoRoot: SCRIPT_ROOT, incomingRoot: resolve(args[0]) });
      writeLines(args[1], result.ready);
      writeLines(args[2], result.staged);
    } else {
      usage();
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
