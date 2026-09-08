#!/usr/bin/env node

// Run a bounded list of cities sequentially, each in its own detached Git
// worktree. Isolation prevents a failed city's data/cache writes from leaking
// into another city's artifact while one process failure cannot stop the shard.

import { spawn, execFileSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { packArtifact } from './refresh-artifact.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function assertCities(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) {
    throw new Error('CITIES_JSON must contain 1-10 city ids');
  }
  for (const city of value) {
    if (!/^[a-z0-9-]+$/.test(city)) throw new Error(`invalid city id: ${city}`);
  }
  if (new Set(value).size !== value.length) throw new Error('duplicate city id in shard');
  return value;
}

function runProcess(command, args, { cwd, env, logPath, timeoutMs, stream = true }) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const chunks = [];
    const collect = (chunk) => {
      chunks.push(chunk);
      if (stream) process.stderr.write(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    let timedOut = false;
    let killTimer = null;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
        else child.kill('SIGTERM');
      } catch { /* process already exited */ }
      killTimer = setTimeout(() => {
        try {
          if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch { /* process already exited */ }
      }, 5_000);
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      const output = Buffer.concat(chunks).toString('utf8');
      if (logPath) {
        mkdirSync(dirname(logPath), { recursive: true });
        writeFileSync(logPath, output, 'utf8');
      }
      resolvePromise({ code: code ?? 1, signal, timedOut, output });
    });
  });
}

export async function runSequential(cities, execute) {
  const outcomes = [];
  for (const city of cities) {
    try { outcomes.push(await execute(city)); }
    catch (error) { outcomes.push({ city, status: 'failed', error: error.message }); }
  }
  return outcomes;
}

function requestCount(path) {
  if (!existsSync(path)) return 0;
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).length;
}

async function executeCity(city, options) {
  const started = Date.now();
  const attemptedAt = new Date(started).toISOString();
  const worktree = join(options.scratchRoot, `worktree-${city}`);
  const triageScratch = join(options.scratchRoot, `triage-${city}`);
  const refreshLog = join(triageScratch, 'refresh.log');
  const sanityLog = join(triageScratch, 'sanity.log');
  const prevMeta = join(triageScratch, 'prev-meta.json');
  const metricsPath = join(triageScratch, 'requests.log');
  mkdirSync(triageScratch, { recursive: true });

  execFileSync('git', ['worktree', 'add', '--detach', worktree, 'HEAD'], { cwd: REPO, stdio: 'ignore' });
  const sharedModules = join(REPO, 'pipeline/node_modules');
  const worktreeModules = join(worktree, 'pipeline/node_modules');
  if (existsSync(sharedModules) && !existsSync(worktreeModules)) symlinkSync(sharedModules, worktreeModules, 'dir');
  const sourceMeta = join(worktree, 'data', city, 'meta.json');
  if (existsSync(sourceMeta)) cpSync(sourceMeta, prevMeta);

  const commonEnv = {
    ...process.env,
    CITY: city,
    FORCE_FAIL: options.forceFail,
    DEBUG_FETCH_DIR: join(triageScratch, 'snapshots'),
    FETCH_METRICS_PATH: metricsPath,
  };
  const refresh = await runProcess(process.execPath, ['src/refresh.js'], {
    cwd: join(worktree, 'pipeline'), env: commonEnv, logPath: refreshLog,
    timeoutMs: options.cityTimeoutMs,
  });
  const sanity = refresh.code === 0 && !refresh.timedOut
    ? await runProcess(process.execPath, ['scripts/sanity-check.js', city], {
      cwd: join(worktree, 'pipeline'), env: commonEnv, logPath: sanityLog,
      timeoutMs: 60_000,
    })
    : { code: 1, timedOut: false, output: '' };
  if (refresh.code === 0 && sanity.code === 0 && !refresh.timedOut) {
    await runProcess(process.execPath, ['scripts/enrich-land-geoportal.js'], {
      cwd: join(worktree, 'pipeline'), env: commonEnv, timeoutMs: 5 * 60_000,
    });
  }

  const durationMs = Date.now() - started;
  const classification = await runProcess(process.execPath, [
    'scripts/triage-report.js', 'classify',
    '--city', city,
    '--refresh-outcome', refresh.timedOut ? 'cancelled' : (refresh.code === 0 ? 'success' : 'failure'),
    '--sanity-outcome', refresh.code !== 0 || refresh.timedOut ? 'skipped' : (sanity.code === 0 ? 'success' : 'failure'),
    '--refresh-log', refreshLog,
    '--sanity-log', sanityLog,
    '--prev-meta', prevMeta,
    '--run-url', options.runUrl,
    '--run-id', options.runId,
    '--out-dir', triageScratch,
  ], {
    cwd: join(worktree, 'pipeline'), env: process.env,
    timeoutMs: 30_000, stream: false,
  });
  if (classification.code !== 0 || classification.timedOut) {
    await runProcess(process.execPath, [
      'scripts/triage-report.js', 'synthesize', '--city', city,
      '--classification', 'adapter-error', '--headline', 'Failure classifier did not complete',
      '--run-url', options.runUrl, '--out-dir', triageScratch,
    ], { cwd: join(worktree, 'pipeline'), env: process.env, timeoutMs: 30_000, stream: false });
  }
  const triageFailed = classification.code !== 0 || classification.timedOut
    || existsSync(join(triageScratch, 'failure.json'));
  const status = refresh.code === 0 && sanity.code === 0 && !refresh.timedOut && !triageFailed
    ? 'ready' : 'failed';
  if (triageFailed) {
    cpSync(triageScratch, join(options.triageRoot, `triage-${city}`), { recursive: true });
  }
  packArtifact({
    repoRoot: worktree,
    outRoot: join(options.artifactRoot, `refresh-result-${city}`),
    kind: 'city', id: city, status,
    metrics: {
      attempted_at: attemptedAt,
      duration_ms: durationMs,
      request_count: requestCount(metricsPath),
    },
  });
  return { city, status, duration_ms: durationMs, request_count: requestCount(metricsPath) };
}

async function main() {
  const cities = assertCities(JSON.parse(process.env.CITIES_JSON || 'null'));
  const artifactRoot = resolve(process.env.ARTIFACT_ROOT || 'refresh-artifacts');
  const triageRoot = resolve(process.env.TRIAGE_ROOT || 'triage-artifacts');
  mkdirSync(artifactRoot, { recursive: true });
  mkdirSync(triageRoot, { recursive: true });
  const scratchBase = resolve(process.env.RUNNER_TEMP || tmpdir());
  const options = {
    artifactRoot,
    triageRoot,
    scratchRoot: mkdtempSync(join(scratchBase, 'refresh-shard-')),
    cityTimeoutMs: Number(process.env.CITY_TIMEOUT_MS || 20 * 60_000),
    forceFail: process.env.FORCE_FAIL || '',
    runUrl: process.env.RUN_URL || '',
    runId: process.env.RUN_ID || '',
  };
  const outcomes = await runSequential(cities, async (city) => {
    try { return await executeCity(city, options); }
    catch (error) {
      const attemptedAt = new Date().toISOString();
      const durationMs = 0;
      packArtifact({
        repoRoot: REPO,
        outRoot: join(artifactRoot, `refresh-result-${city}`),
        kind: 'city', id: city, status: 'failed',
        metrics: { attempted_at: attemptedAt, duration_ms: durationMs, request_count: 0 },
      });
      await runProcess(process.execPath, [
        'scripts/triage-report.js', 'synthesize', '--city', city,
        '--classification', 'adapter-error', '--headline', error.message,
        '--run-url', options.runUrl, '--out-dir', join(triageRoot, `triage-${city}`),
      ], { cwd: join(REPO, 'pipeline'), env: process.env, timeoutMs: 30_000, stream: false });
      return { city, status: 'failed', duration_ms: durationMs, request_count: 0, error: error.message };
    }
  });
  for (const outcome of outcomes) {
    console.error(`SHARD ${outcome.city}: ${outcome.status} ${outcome.duration_ms}ms ${outcome.request_count} instrumented request(s)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
