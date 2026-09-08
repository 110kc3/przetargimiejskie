import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('request metrics record only normalized source hosts', async () => {
  const root = mkdtempSync(join(tmpdir(), 'request-metrics-'));
  const metricsPath = join(root, 'requests.log');
  process.env.FETCH_METRICS_PATH = metricsPath;
  const { recordRequest } = await import(`../src/core/request-metrics.js?test=${Date.now()}`);

  recordRequest('https://Example.GOV.PL/path?secret=not-recorded');
  recordRequest('not a URL');

  assert.equal(readFileSync(metricsPath, 'utf8'), 'example.gov.pl\n');
});
