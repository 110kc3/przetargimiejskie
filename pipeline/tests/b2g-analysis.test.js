import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyseB2G,
  classifyOutcome,
} from '../../scripts/lib/b2g-analysis.mjs';

const listing = (date, outcome, extra = {}) => ({
  date,
  outcome,
  kind: 'mieszkalny',
  starting_price_pln: 100_000,
  ...extra,
});

const property = (key, listings, extra = {}) => ({
  key,
  street: `Street ${key}`,
  street_norm: `street ${key}`,
  building: '1',
  apt: key,
  kind: 'mieszkalny',
  listings,
  ...extra,
});

const options = {
  assetClass: 'mieszkalny',
  from: '2024-01-01',
  to: '2024-12-31',
  minimumDecided: 1,
};

test('requires an explicit asset class and inclusive fixed date range', () => {
  assert.throws(() => analyseB2G([], { from: '2024-01-01', to: '2024-12-31' }), /assetClass/);
  assert.throws(() => analyseB2G([], { assetClass: 'mieszkalny', from: '2024-02-30', to: '2024-12-31' }), /valid/);
  assert.throws(() => analyseB2G([], { assetClass: 'mieszkalny', from: '2025-01-01', to: '2024-12-31' }), /before/);

  const result = analyseB2G([
    property('a', [
      listing('2023-12-31', 'sold'),
      listing('2024-01-01', 'sold'),
      listing('2024-12-31', 'unsold'),
      listing('2025-01-01', 'unsold'),
      listing(null, 'sold'),
      listing('2024-06-01', 'sold', { kind: 'garaz' }),
    ]),
  ], options);

  assert.deepEqual(result.events.map((event) => event.date), ['2024-01-01', '2024-12-31']);
  assert.equal(result.scope.dateRange, 'inclusive');
  assert.equal(result.selection.excludedOutsideDateRange, 2);
  assert.equal(result.selection.excludedMissingOrInvalidDate, 1);
  assert.equal(result.selection.excludedDifferentAssetClass, 1);
});

test('unknown and archived outcomes never count as unsold', () => {
  assert.equal(classifyOutcome('sold'), 'sold');
  assert.equal(classifyOutcome('unsold'), 'unsold');
  assert.equal(classifyOutcome('archived'), 'unknown');
  assert.equal(classifyOutcome('active'), 'unknown');
  assert.equal(classifyOutcome(null), 'unknown');

  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'sold')]),
    property('b', [listing('2024-02-01', 'unsold', { unsold_reason: 'no_deposits' })]),
    property('c', [listing('2024-03-01', 'archived', { unsold_reason: 'no_deposits' })]),
    property('d', [listing('2024-04-01', 'active')]),
  ], options);

  assert.deepEqual(result.outcomes.counts, { total: 4, sold: 1, unsold: 1, unknown: 2, decided: 2 });
  assert.equal(result.noDeposit.explicitlyUnsoldObservedAttempts, 1);
  assert.equal(result.noDeposit.explicitlyUnsoldWithNoDeposits, 1);
  assert.deepEqual(result.byYear[0].counts, result.outcomes.counts);
});

test('elapsed observations start only at explicit unsold and end at the next distinct date', () => {
  const result = analyseB2G([
    property('a', [
      listing('2024-01-01', 'unsold'),
      // A duplicate source row on the same date is folded, not a zero-day attempt.
      listing('2024-01-01', 'archived', {
        detail_url: 'https://example.test/a',
        unsold_reason: 'no_deposits',
      }),
      listing('2024-01-11', 'archived'),
      listing('2024-02-01', 'sold'),
      listing('2024-03-01', 'unsold'),
      listing('2024-03-21', 'active'),
    ]),
    property('b', [
      listing('2024-05-01', 'archived'),
      listing('2024-05-20', 'sold'),
    ]),
  ], options);

  assert.deepEqual(result.elapsedAfterExplicitlyUnsold.observations, [
    { propertyKey: 'a', fromDate: '2024-01-01', toDate: '2024-01-11', elapsedDays: 10, nextObservedOutcome: 'unknown' },
    { propertyKey: 'a', fromDate: '2024-03-01', toDate: '2024-03-21', elapsedDays: 20, nextObservedOutcome: 'unknown' },
  ]);
  assert.equal(result.elapsedAfterExplicitlyUnsold.summaryDays.median, 15);
  assert.equal(result.repeatedAttempts.propertiesWithMultipleObservedAttempts, 2);
  assert.equal(result.events.find((event) => event.date === '2024-01-01').observedRawRows, 2);
  assert.deepEqual(result.events.find((event) => event.date === '2024-01-01').outcomeSourceUrls, [],
    'an archived duplicate URL does not evidence the explicit unsold outcome');
  assert.equal(result.provenance.decidedOutcomeSourceCoverage.numerator, 0);
  assert.equal(result.noDeposit.explicitlyUnsoldWithNoDeposits, 0,
    'a reason attached only to an archived duplicate is not explicit-unsold evidence');
});

test('published starting-price trajectories are descriptive chronological changes', () => {
  const result = analyseB2G([
    property('a', [
      listing('2024-01-01', 'unsold', { starting_price_pln: 200_000, round: 1 }),
      listing('2024-02-01', 'unsold', { starting_price_pln: null, round: 2, round_inferred: true }),
      listing('2024-03-01', 'sold', { starting_price_pln: 180_000, round: 3, round_source: 'explicit' }),
      listing('2024-04-01', 'sold', { starting_price_pln: 198_000, round: null }),
    ]),
  ], options);

  const trajectory = result.publishedStartingPriceTrajectories[0];
  assert.deepEqual(trajectory.points.map((point) => point.publishedStartingPricePln), [200_000, 180_000, 198_000]);
  assert.deepEqual(trajectory.changes.map((change) => [change.changePln, change.changePercentage]), [
    [-20_000, -10],
    [18_000, 10],
  ]);
  assert.deepEqual(result.roundField.counts, {
    explicit: 1,
    inferred: 1,
    unverified: 1,
    unknown: 1,
    conflicting: 0,
  });
  assert.equal(result.events[0].reportedRoundEvidence, 'unverified', 'unmarked round is not called explicit');
});

test('price-change summary uses only an explicitly unsold event and its immediate next observed event', () => {
  const result = analyseB2G([
    property('a', [
      listing('2024-01-01', 'unsold', { starting_price_pln: 200_000 }),
      listing('2024-02-01', 'sold', { starting_price_pln: 180_000 }),
      listing('2024-03-01', 'sold', { starting_price_pln: 170_000 }),
    ]),
    property('b', [
      listing('2024-01-10', 'archived', { starting_price_pln: 300_000 }),
      listing('2024-02-10', 'sold', { starting_price_pln: 270_000 }),
    ]),
    property('c', [
      listing('2024-01-20', 'unsold', { starting_price_pln: 100_000 }),
      listing('2024-02-20', 'active', { starting_price_pln: null }),
      listing('2024-03-20', 'sold', { starting_price_pln: 80_000 }),
    ]),
  ], options);

  assert.deepEqual(result.publishedStartingPriceChangesAfterExplicitlyUnsold.observations, [{
    propertyKey: 'a',
    fromDate: '2024-01-01',
    toDate: '2024-02-01',
    fromPublishedStartingPricePln: 200_000,
    toPublishedStartingPricePln: 180_000,
    changePln: -20_000,
    changePercentage: -10,
    nextObservedOutcome: 'sold',
  }]);
  assert.equal(result.publishedStartingPriceChangesAfterExplicitlyUnsold.summaryPercentage.median, -10);
});

test('normalized event provenance is source-linked and fingerprint is input-order independent', () => {
  const a = property('a', [
    listing('2024-01-01', 'unsold', {
      source_pdf: 'https://example.test/result.pdf',
      detail_url: 'https://example.test/detail',
      bip_url: 'javascript:alert(1)',
      unsold_reason: 'no_deposits',
    }),
    listing('2024-02-01', 'sold', { source_url: 'https://example.test/source' }),
  ]);
  const b = property('b', [
    listing('2024-03-01', 'archived', { bip_url: 'https://example.test/bip' }),
  ]);
  const first = analyseB2G([a, b], options);
  const second = analyseB2G([
    { ...b, listings: [...b.listings].reverse() },
    { ...a, listings: [...a.listings].reverse() },
  ], options);

  assert.equal(first.inputFingerprint, second.inputFingerprint);
  assert.deepEqual(first.events[0].sourceUrls, [
    'https://example.test/result.pdf',
    'https://example.test/detail',
  ]);
  assert.equal(first.events[0].sourceUrl, 'https://example.test/result.pdf');
  assert.equal(first.provenance.observedAttemptSourceCoverage.denominator, 3);
  assert.equal(first.provenance.observedAttemptSourceCoverage.numerator, 3);
  assert.match(first.inputFingerprint, /^sha256:[0-9a-f]{64}$/);
});

test('readiness reports an insufficient decided sample with an explicit shortfall', () => {
  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'sold')]),
    property('b', [listing('2024-02-01', 'archived')]),
  ], { ...options, minimumDecided: 3 });

  assert.equal(result.readiness.ready, false);
  assert.equal(result.readiness.status, 'insufficient_sample');
  assert.equal(result.readiness.checks.decidedSample.actual, 1);
  assert.equal(result.readiness.checks.decidedSample.minimum, 3);
  assert.ok(result.readiness.reasons.includes('Only 1 decided observed attempts; minimum is 3.'));
});

test('readiness reports outcome balance, source coverage and unknown completeness', () => {
  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'sold', { source_pdf: 'https://example.test/a.pdf' })]),
    property('b', [listing('2024-02-01', 'sold')]),
    property('c', [listing('2024-03-01', 'unsold', { source_pdf: 'https://example.test/c.pdf' })]),
    property('d', [listing('2024-04-01', 'archived', { source_pdf: 'https://example.test/d.pdf' })]),
    property('e', [listing('2024-05-01', 'active', { source_pdf: 'https://example.test/e.pdf' })]),
  ], {
    ...options,
    minimumDecided: 3,
    minimumEachOutcome: 2,
    minimumSourceCoverage: 0.8,
    maximumUnknownShare: 0.2,
  });

  assert.equal(result.readiness.ready, false);
  assert.deepEqual(result.readiness.checks.soldAndUnsoldBalance, {
    passed: false, sold: 2, unsold: 1, minimumEach: 2,
  });
  assert.equal(result.readiness.checks.decidedSourceCoverage.percentage, 66.7);
  assert.equal(result.readiness.checks.decidedSourceCoverage.passed, false);
  assert.equal(result.readiness.checks.unknownOutcomeShare.percentage, 40);
  assert.equal(result.readiness.checks.unknownOutcomeShare.passed, false);
  assert.equal(result.readiness.reasons.length, 3);
});

test('outcomes inferred only from a later round remain unknown', () => {
  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'unsold', {
      source_pdf: 'https://example.test/announcement',
      unsold_reason: 'superseded_by_next_round',
      outcome_evidence: 'inferred',
    })]),
    property('b', [listing('2024-02-01', 'sold', {
      source_pdf: 'https://example.test/result.pdf',
    })]),
  ], options);

  assert.deepEqual(result.outcomes.counts, { total: 2, sold: 1, unsold: 0, unknown: 1, decided: 1 });
  assert.equal(result.selection.downgradedInferredOutcomes, 1);
  assert.deepEqual(result.events[0].rawOutcomes, ['unsold']);
  assert.deepEqual(result.events[0].outcomeEvidenceValues, ['inferred']);
});

test('an explicit owner-type exclusion keeps non-municipal assets out of scope', () => {
  const stateAsset = property('state', [
    listing('2024-01-01', 'archived', {
      detail_url: 'https://example.test/state-round-1',
    }),
    listing('2024-03-01', 'active', {
      detail_url: 'https://example.test/state-round-2', owner_type: 'state_treasury',
    }),
  ]);
  const municipalAsset = property('municipal', [listing('2024-02-01', 'sold', {
    source_pdf: 'https://example.test/result.pdf',
  })]);
  const result = analyseB2G([stateAsset, municipalAsset], {
    ...options,
    excludedOwnerTypes: ['state_treasury'],
  });

  assert.deepEqual(result.events.map((event) => event.propertyKey), ['municipal']);
  assert.equal(result.selection.excludedOwnerType, 2,
    'one unambiguous asset-owner marker scopes the whole property timeline');
  assert.deepEqual(result.scope.excludedOwnerTypes, ['state_treasury']);
});

test('an unknown unsold-reason sentinel is not reported as published reason coverage', () => {
  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'unsold', {
      unsold_reason: 'unknown', source_pdf: 'https://example.test/result.pdf',
    })]),
  ], options);
  assert.equal(result.noDeposit.explicitlyUnsoldObservedAttempts, 1);
  assert.equal(result.noDeposit.explicitlyUnsoldWithPublishedReason, 0);
  assert.equal(result.noDeposit.reasonCoverageAmongExplicitlyUnsold.percentage, 0);
});

test('portable reason taxonomy normalizes deposit codes and ignores generic negative-result labels', () => {
  const result = analyseB2G([
    property('a', [listing('2024-01-01', 'unsold', {
      unsold_reason: 'no_wadium', source_pdf: 'https://example.test/a.pdf',
    })]),
    property('b', [listing('2024-02-01', 'unsold', {
      unsold_reason: 'wynik negatywny', source_pdf: 'https://example.test/b.pdf',
    })]),
  ], options);
  assert.equal(result.noDeposit.explicitlyUnsoldWithNoDeposits, 1);
  assert.equal(result.noDeposit.explicitlyUnsoldWithPublishedReason, 1);
  assert.equal(result.noDeposit.normalizedReasonCoverageAmongExplicitlyUnsold.percentage, 50);
});
