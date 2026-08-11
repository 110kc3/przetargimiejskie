import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

import { analyseB2G } from '../../scripts/lib/b2g-analysis.mjs';
import {
  parseArgs,
  renderCsv,
  renderReportHtml,
} from '../../scripts/build-onepager.mjs';
import {
  parseReadinessArgs,
  summarizeReadiness,
} from '../../scripts/audit-b2g-readiness.mjs';

const properties = [{
  key: '=formula|1|2',
  street: '=FORMULA',
  street_norm: '=formula',
  building: '1',
  apt: '2',
  kind: 'mieszkalny',
  listings: [
    {
      date: '2024-01-10', kind: 'mieszkalny', outcome: 'unsold',
      unsold_reason: 'bidder_withdrew', starting_price_pln: 200_000,
      source_pdf: 'https://example.test/result-1.pdf', round: 1,
    },
    {
      date: '2024-03-10', kind: 'mieszkalny', outcome: 'sold',
      starting_price_pln: 180_000, final_price_pln: 181_800,
      source_pdf: 'https://example.test/result-2.pdf', round: 2,
    },
    {
      date: '2024-06-10', kind: 'mieszkalny', outcome: 'archived',
      starting_price_pln: 170_000, detail_url: 'https://example.test/detail', round: 3,
    },
  ],
}];

const analysis = analyseB2G(properties, {
  assetClass: 'mieszkalny',
  from: '2024-01-01',
  to: '2024-12-31',
  minimumDecided: 1,
  minimumEachOutcome: 1,
  minimumSourceCoverage: 0.5,
  maximumUnknownShare: 0.5,
});

test('CLI requires an explicit property class, inclusive start/end dates, and city', () => {
  assert.throws(() => parseArgs(['gliwice']), /usage/);
  assert.throws(() => parseArgs(['--kind', 'mieszkalny', '--from', '2024-01-01', '--to', '2024-12-31']), /usage/);
  assert.throws(() => parseArgs(['--kind', 'mieszkalny', '--from', '2024-01-01', '--to', '2024-12-31', '--web-example', 'gliwice']), /output-dir/);
  assert.deepEqual(parseArgs([
    '--kind', 'mieszkalny', '--from', '2024-01-01', '--to', '2024-12-31',
    '--output-dir', 'site/example', '--web-example', 'gliwice',
  ]), {
    cityIds: ['gliwice'],
    outputDir: 'site/example',
    webExample: true,
    assetClass: 'mieszkalny',
    from: '2024-01-01',
    to: '2024-12-31',
  });
});

test('readiness CLI requires scope and emits a serializable city summary', () => {
  assert.throws(() => parseReadinessArgs(['gliwice']), /usage/);
  assert.deepEqual(parseReadinessArgs([
    '--kind', 'mieszkalny', '--from', '2024-01-01', '--to', '2024-12-31',
    '--json', 'gliwice',
  ]), {
    cityIds: ['gliwice'],
    json: true,
    assetClass: 'mieszkalny',
    from: '2024-01-01',
    to: '2024-12-31',
  });
  const summary = summarizeReadiness(
    { id: 'gliwice', label: 'Gliwice' },
    { generated_at: '2026-08-09T04:58:31.913Z' },
    analysis,
  );
  assert.equal(summary.ready, true);
  assert.deepEqual([summary.sold, summary.unsold, summary.unknown], [1, 1, 1]);
  assert.equal(summary.decidedSourceCoveragePercentage, 100);
  assert.match(summary.inputFingerprint, /^sha256:/);
});

test('report renders explicit denominators, unknown outcomes, provenance and the product boundary', () => {
  const html = renderReportHtml({
    city: { id: 'gliwice', label: 'Gliwice', authority: 'ZGM' },
    meta: { generated_at: '2026-08-09T04:58:31.913Z' },
    analysis,
    csvName: 'rejestr.csv',
    pdfName: 'karta.pdf',
    publicExample: true,
  });

  for (const expected of [
    '1 / 2',
    '1 / 3',
    'brak opublikowanego wyniku',
    'fingerprint:',
    'Nie stanowi wyceny nieruchomości',
    'dokument źródłowy',
    '<caption',
  ]) assert.ok(html.includes(expected), `missing report content: ${expected}`);

  for (const unsafe of [
    'problem zasięgu, nie cen',
    'realna kwota jest wyższa',
    'jak ustalić cenę',
    'utracony przychód',
    'koszt nieudanego przetargu',
  ]) assert.ok(!html.toLowerCase().includes(unsafe), `unsafe claim present: ${unsafe}`);
});

test('CSV is source-linked, keeps unknown separate, carries scope/fingerprint and guards spreadsheet formulas', () => {
  const csv = renderCsv(analysis);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"brak opublikowanego wyniku"/);
  assert.match(csv, /https:\/\/example\.test\/result-1\.pdf/);
  assert.match(csv, /wycofanie lub rezygnacja oferenta/);
  assert.match(csv, /sha256:[0-9a-f]{64}/);
  assert.match(csv, /"'=FORMULA"/);
  assert.equal((csv.match(/"bez nabywcy"/g) || []).length, 1,
    'only the explicitly unsold event is labelled without a buyer');
});

test('published Gliwice example is internally synchronized with its frozen source analysis', () => {
  const repoFile = (path) => new URL(`../../${path}`, import.meta.url);
  const snapshot = JSON.parse(readFileSync(
    repoFile('site/dla-samorzadow/przyklad-gliwice/analiza-zrodlowa.json'), 'utf8',
  ));
  const current = snapshot.analysis;
  const exampleHtml = readFileSync(repoFile('site/dla-samorzadow/przyklad-gliwice/index.html'), 'utf8');
  const exampleCsv = readFileSync(repoFile('site/dla-samorzadow/przyklad-gliwice/rejestr-zrodel.csv'), 'utf8');

  assert.deepEqual(current.outcomes.counts, {
    total: 152, sold: 58, unsold: 90, unknown: 4, decided: 148,
  });
  assert.equal(current.readiness.ready, true);
  assert.deepEqual(current.scope.excludedOwnerTypes, ['state_treasury']);
  assert.equal(current.selection.excludedOwnerType, 1);
  assert.equal(current.provenance.uniqueSourceUrlCount, 43);
  assert.deepEqual({
    checkedAt: snapshot.sourceVerification.checkedAt,
    recordedUrls: snapshot.sourceVerification.recordedUrls,
    httpOkUrls: snapshot.sourceVerification.httpOkUrls,
    uniqueOutcomeSourceUrls: snapshot.sourceVerification.uniqueOutcomeSourceUrls,
    outcomeSourceUrlsHttpOk: snapshot.sourceVerification.outcomeSourceUrlsHttpOk,
    unavailableCount: snapshot.sourceVerification.unavailableSupplementaryUrls.length,
  }, {
    checkedAt: '2026-08-11', recordedUrls: 43, httpOkUrls: 41,
    uniqueOutcomeSourceUrls: 38, outcomeSourceUrlsHttpOk: 38, unavailableCount: 2,
  });
  assert.equal(current.selection.includedProperties, 79);
  assert.equal(current.repeatedAttempts.propertiesWithMultipleObservedAttempts, 42);
  assert.deepEqual(current.elapsedAfterExplicitlyUnsold.summaryDays,
    { sampleSize: 73, minimum: 42, median: 49, maximum: 140, mean: 59.2 });
  assert.equal(current.publishedStartingPriceChangesAfterExplicitlyUnsold.summaryPercentage.sampleSize, 73);
  assert.equal(current.publishedStartingPriceChangesAfterExplicitlyUnsold.summaryPercentage.median, -10);
  assert.equal(current.noDeposit.explicitlyUnsoldWithNoDeposits, 69);
  assert.ok(current.events.every((event) => event.ownerType !== 'state_treasury'));
  for (const expected of [
    current.inputFingerprint,
    '58 / 148',
    '90 / 148',
    '4 / 152',
    'Poniżej 8 najnowszych pozycji',
    './karta-wynikow.pdf',
    './rejestr-zrodel.csv',
    './analiza-zrodlowa.json',
    'wyłączono 1 zdarzenie oznaczone',
    '38/38 unikalnych adresów dokumentów potwierdzających rozstrzygnięcia',
  ]) assert.ok(exampleHtml.includes(expected), `stale public HTML: missing ${expected}`);

  const csvRows = exampleCsv.split('\r\n').filter(Boolean);
  assert.equal(csvRows.length, current.events.length + 1, 'public CSV must have one row per event');
  assert.ok(csvRows.slice(1).every((row) => row.includes(current.inputFingerprint)),
    'every public CSV event must carry the current fingerprint');
  assert.ok(exampleCsv.includes('wycofanie lub rezygnacja oferenta'),
    'public CSV must expose the normalized Polish reason label');
  assert.ok(exampleCsv.includes('surowe_kody_powodu'),
    'raw parser codes remain explicitly labelled audit fields');
  assert.ok(statSync(repoFile('site/dla-samorzadow/przyklad-gliwice/karta-wynikow.pdf')).size > 50_000,
    'public PDF must exist and be non-empty');
});
