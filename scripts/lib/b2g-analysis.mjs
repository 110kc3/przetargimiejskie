import { createHash } from 'node:crypto';

/**
 * Pure, deterministic analysis for the B2G disposal-performance report.
 *
 * The module deliberately describes only observed, published auction events.
 * It does not estimate property value, infer an optimal price, or treat an
 * archived/active/missing result as a failed auction.
 */

export const B2G_ANALYSIS_SCHEMA_VERSION = 1;
export const DEFAULT_MINIMUM_DECIDED = 20;
export const DEFAULT_MINIMUM_EACH_OUTCOME = 3;
export const DEFAULT_MINIMUM_SOURCE_COVERAGE = 1;
export const DEFAULT_MAXIMUM_UNKNOWN_SHARE = 0.25;
export const MUNICIPAL_EXCLUDED_OWNER_TYPES = Object.freeze(['state_treasury']);

const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_FIELDS = ['source_pdf', 'source_url', 'detail_url', 'bip_url'];
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** Classify only source-stated sold/unsold outcomes as decided. */
export function classifyOutcome(outcome) {
  const normalized = typeof outcome === 'string' ? outcome.trim().toLowerCase() : '';
  if (normalized === 'sold') return 'sold';
  if (normalized === 'unsold') return 'unsold';
  return 'unknown';
}

function outcomeEvidenceOf(listing, classifiedOutcome) {
  if (classifiedOutcome === 'unknown') return 'unknown';
  const marker = String(listing?.outcome_evidence ?? listing?.outcomeEvidence ?? '').trim().toLowerCase();
  if (['inferred', 'derived', 'superseded'].includes(marker)) return 'inferred';
  if (['source_stated', 'source-stated', 'explicit'].includes(marker)) return 'source_stated';
  const notes = Array.isArray(listing?.notes) ? listing.notes.join(' ') : String(listing?.notes ?? '');
  if (
    listing?.unsold_reason === 'superseded_by_next_round'
    || /not a source-stated result|outcome inferred from (?:the |a )?(?:next|later) round/i.test(notes)
  ) return 'inferred';
  return 'source_stated';
}

function parseIsoDate(value, fieldName = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return null;
  return { value, time, year: String(year), fieldName };
}

function requireDate(value, fieldName) {
  const parsed = parseIsoDate(value, fieldName);
  if (!parsed) throw new TypeError(`${fieldName} must be a valid YYYY-MM-DD date`);
  return parsed;
}

function finitePositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function stableCanonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableCanonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableCanonical(value[key])}`
  )).join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(stableCanonical(value)).digest('hex');
}

function propertyKey(property) {
  for (const candidate of [property?.key, property?.id]) {
    if (candidate != null && String(candidate).trim()) return String(candidate).trim();
  }
  const identity = {
    street: property?.street_norm ?? property?.street ?? null,
    building: property?.building ?? null,
    apt: property?.apt ?? null,
    parcel: property?.dzialka_nr ?? property?.parcel ?? null,
  };
  return `anonymous:${sha256(identity).slice(0, 16)}`;
}

function addressOf(property) {
  return {
    street: property?.street ?? null,
    streetNorm: property?.street_norm ?? null,
    building: property?.building ?? null,
    apt: property?.apt ?? null,
    parcel: property?.dzialka_nr ?? property?.parcel ?? null,
  };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sourcesOf(listing) {
  const seen = new Set();
  const urls = [];
  for (const field of SOURCE_FIELDS) {
    const value = listing?.[field];
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || !candidate.trim()) continue;
      const url = candidate.trim();
      if (!isHttpUrl(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push({ field, url });
    }
  }
  return urls;
}

function foldedSourceEntries(records) {
  return [...new Map(records.flatMap((record) => record.sources)
    .map((source) => [source.url, source])).values()].sort((a, b) => (
    SOURCE_FIELDS.indexOf(a.field) - SOURCE_FIELDS.indexOf(b.field)
    || compareText(a.url, b.url)
  ));
}

function roundEvidence(listing) {
  const value = Number.isInteger(listing?.round) && listing.round > 0 ? listing.round : null;
  if (value == null) return { value: null, evidence: 'unknown' };

  const marker = String(listing?.round_source ?? listing?.round_provenance ?? '').toLowerCase();
  if (
    listing?.round_inferred === true
    || marker === 'inferred'
    || marker === 'derived'
    || marker === 'history'
  ) return { value, evidence: 'inferred' };

  if (
    listing?.round_explicit === true
    || listing?.round_inferred === false
    || marker === 'explicit'
    || marker === 'source'
    || marker === 'source-stated'
  ) return { value, evidence: 'explicit' };

  // Existing pipeline data often contains history-derived round numbers without
  // a provenance marker. Keep the value for audit display, but never call it an
  // explicit statutory round and never use it to build sequences or durations.
  return { value, evidence: 'unverified' };
}

function ratio(numerator, denominator) {
  return {
    numerator,
    denominator,
    rate: denominator ? numerator / denominator : null,
    percentage: denominator ? Math.round((numerator * 1000) / denominator) / 10 : null,
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function numericSummary(values) {
  if (!values.length) {
    return { sampleSize: 0, minimum: null, median: null, maximum: null, mean: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    sampleSize: values.length,
    minimum: Math.min(...values),
    median: median(values),
    maximum: Math.max(...values),
    mean: Math.round((total / values.length) * 10) / 10,
  };
}

function oneOrNull(values) {
  const unique = [...new Set(values.filter((value) => value != null))].sort((a, b) => (
    typeof a === 'number' && typeof b === 'number' ? a - b : compareText(String(a), String(b))
  ));
  return { value: unique.length === 1 ? unique[0] : null, values: unique };
}

function foldedOutcome(records) {
  const explicit = new Set(records.map((record) => record.outcome).filter((value) => value !== 'unknown'));
  return explicit.size === 1 ? [...explicit][0] : 'unknown';
}

function unsoldReasonCategory(reason) {
  const normalized = typeof reason === 'string' ? reason.trim().toLowerCase() : '';
  if (!normalized || [
    'unknown', 'superseded_by_next_round', 'negatywny', 'wynik negatywny', 'wynikiem negatywnym',
  ].includes(normalized)) return 'unknown';
  if ([
    'no_deposits', 'no_wadium', 'brak wadium', 'brak wpłaty wadium',
  ].includes(normalized)) return 'no_deposits';
  if (normalized === 'bidder_noshow') return 'bidder_noshow';
  if (normalized === 'bidder_withdrew') return 'bidder_withdrew';
  if ([
    'brak_oferentow', 'no_participants', 'negative_no_bidders', 'brak chętnych',
    'no_buyer', 'brak_uczestnikow', 'no_bidders', 'brak uczestnikow',
  ].includes(normalized)) return 'no_participants';
  return 'unclassified';
}

function foldedRound(records) {
  const withValues = records.map((record) => record.round).filter((item) => item.value != null);
  const values = [...new Set(withValues.map((item) => item.value))].sort((a, b) => a - b);
  if (!values.length) return { value: null, evidence: 'unknown', reportedValues: [] };
  if (values.length > 1) return { value: null, evidence: 'conflicting', reportedValues: values };
  if (withValues.some((item) => item.evidence === 'inferred')) {
    return { value: values[0], evidence: 'inferred', reportedValues: values };
  }
  if (withValues.every((item) => item.evidence === 'explicit')) {
    return { value: values[0], evidence: 'explicit', reportedValues: values };
  }
  return { value: values[0], evidence: 'unverified', reportedValues: values };
}

function foldEvent(records, assetClass) {
  const first = [...records].sort((a, b) => compareText(stableCanonical(a.address), stableCanonical(b.address)))[0];
  const outcome = foldedOutcome(records);
  const starting = oneOrNull(records.map((record) => record.startingPricePln));
  const final = oneOrNull(records.map((record) => record.finalPricePln));
  const unsoldReasons = outcome === 'unsold'
    ? [...new Set(records
      .filter((record) => record.outcome === 'unsold')
      .map((record) => record.unsoldReason)
      .filter(Boolean))].sort(compareText)
    : [];
  const unsoldReasonCategories = [...new Set(unsoldReasons.map(unsoldReasonCategory))].sort(compareText);
  const round = foldedRound(records);
  const sourceEntries = foldedSourceEntries(records);
  const outcomeSourceEntries = outcome === 'unknown'
    ? []
    : foldedSourceEntries(records.filter((record) => record.outcome === outcome));
  const ownerType = oneOrNull(records.map((record) => record.ownerType));

  return {
    propertyKey: first.propertyKey,
    address: first.address,
    kind: assetClass,
    date: first.date,
    year: first.year,
    observedSequence: null,
    outcome,
    rawOutcomes: [...new Set(records.map((record) => record.rawOutcome).filter(Boolean))].sort(compareText),
    outcomeEvidenceValues: [...new Set(records.map((record) => record.outcomeEvidence))].sort(compareText),
    ownerType: ownerType.value,
    ownerTypeValues: ownerType.values,
    observedRawRows: records.length,
    publishedStartingPricePln: starting.value,
    publishedStartingPriceValuesPln: starting.values,
    publishedFinalPricePln: final.value,
    publishedFinalPriceValuesPln: final.values,
    unsoldReason: unsoldReasons.length === 1 ? unsoldReasons[0] : null,
    unsoldReasons,
    unsoldReasonCategory: unsoldReasonCategories.length === 1 ? unsoldReasonCategories[0] : null,
    unsoldReasonCategories,
    outcomeSourceUrl: outcomeSourceEntries[0]?.url ?? null,
    outcomeSourceUrls: outcomeSourceEntries.map((source) => source.url),
    sourceUrl: outcome === 'unknown'
      ? sourceEntries[0]?.url ?? null
      : outcomeSourceEntries[0]?.url ?? null,
    sourceUrls: sourceEntries.map((source) => source.url),
    sourceFields: [...new Set(sourceEntries.map((source) => source.field))],
    reportedRound: round.value,
    reportedRoundEvidence: round.evidence,
    reportedRoundValues: round.reportedValues,
  };
}

function selectionRows(properties, assetClass, from, to, excludedOwnerTypes) {
  const rows = [];
  const stats = {
    inputProperties: properties.length,
    inputListingRows: 0,
    excludedDifferentAssetClass: 0,
    excludedOwnerType: 0,
    excludedMissingOrInvalidDate: 0,
    excludedOutsideDateRange: 0,
    downgradedInferredOutcomes: 0,
  };

  for (const property of properties) {
    const key = propertyKey(property);
    const address = addressOf(property);
    const listings = Array.isArray(property?.listings) ? property.listings : [];
    const propertyOwnerTypes = [...new Set([
      property?.owner_type,
      ...listings.map((listing) => listing?.owner_type),
    ].filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim()))];
    // Ownership scope describes the asset, while a parser may learn it from
    // only one announcement in a multi-round timeline. Inherit a single
    // unambiguous marker across that property; conflicting markers remain
    // listing-local and are exposed instead of guessed.
    const inheritedOwnerType = propertyOwnerTypes.length === 1 ? propertyOwnerTypes[0] : '';
    for (const listing of listings) {
      stats.inputListingRows++;
      const kind = listing?.kind ?? property?.kind ?? null;
      if (kind !== assetClass) {
        stats.excludedDifferentAssetClass++;
        continue;
      }
      const date = parseIsoDate(listing?.date);
      if (!date) {
        stats.excludedMissingOrInvalidDate++;
        continue;
      }
      if (date.time < from.time || date.time > to.time) {
        stats.excludedOutsideDateRange++;
        continue;
      }
      const ownerType = typeof listing?.owner_type === 'string' && listing.owner_type.trim()
        ? listing.owner_type.trim()
        : inheritedOwnerType;
      if (ownerType && excludedOwnerTypes.has(ownerType)) {
        stats.excludedOwnerType++;
        continue;
      }
      const rawOutcome = listing?.outcome == null ? null : String(listing.outcome);
      const classifiedOutcome = classifyOutcome(rawOutcome);
      const outcomeEvidence = outcomeEvidenceOf(listing, classifiedOutcome);
      if (classifiedOutcome !== 'unknown' && outcomeEvidence === 'inferred') {
        stats.downgradedInferredOutcomes++;
      }
      rows.push({
        propertyKey: key,
        address,
        date: date.value,
        dateTime: date.time,
        year: date.year,
        outcome: outcomeEvidence === 'inferred' ? 'unknown' : classifiedOutcome,
        rawOutcome,
        outcomeEvidence,
        ownerType: ownerType || null,
        startingPricePln: finitePositive(listing?.starting_price_pln),
        finalPricePln: finitePositive(listing?.final_price_pln),
        unsoldReason: typeof listing?.unsold_reason === 'string' && listing.unsold_reason.trim()
          ? listing.unsold_reason.trim()
          : null,
        sources: sourcesOf(listing),
        round: roundEvidence(listing),
      });
    }
  }

  rows.sort((a, b) => (
    compareText(a.propertyKey, b.propertyKey)
    || compareText(a.date, b.date)
    || compareText(stableCanonical(a), stableCanonical(b))
  ));
  return { rows, stats };
}

function buildEvents(rows, assetClass) {
  const grouped = new Map();
  for (const row of rows) {
    const id = `${row.propertyKey}\u0000${row.date}`;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row);
  }
  const events = [...grouped.values()].map((records) => foldEvent(records, assetClass));
  events.sort((a, b) => compareText(a.propertyKey, b.propertyKey) || compareText(a.date, b.date));

  let lastProperty = null;
  let observedSequence = 0;
  for (const event of events) {
    if (event.propertyKey !== lastProperty) {
      lastProperty = event.propertyKey;
      observedSequence = 0;
    }
    event.observedSequence = ++observedSequence;
  }
  return events;
}

function eventsByProperty(events) {
  const grouped = new Map();
  for (const event of events) {
    if (!grouped.has(event.propertyKey)) grouped.set(event.propertyKey, []);
    grouped.get(event.propertyKey).push(event);
  }
  return grouped;
}

function outcomeCounts(events) {
  const counts = { total: events.length, sold: 0, unsold: 0, unknown: 0, decided: 0 };
  for (const event of events) counts[event.outcome]++;
  counts.decided = counts.sold + counts.unsold;
  return counts;
}

function byYear(events) {
  const grouped = new Map();
  for (const event of events) {
    if (!grouped.has(event.year)) grouped.set(event.year, []);
    grouped.get(event.year).push(event);
  }
  return [...grouped.entries()].sort(([a], [b]) => compareText(a, b)).map(([year, rows]) => {
    const counts = outcomeCounts(rows);
    return {
      year,
      counts,
      sellThroughAmongDecided: ratio(counts.sold, counts.decided),
      unsoldShareAmongDecided: ratio(counts.unsold, counts.decided),
      unknownShareAmongObserved: ratio(counts.unknown, counts.total),
    };
  });
}

function repeatedAttemptAnalysis(grouped) {
  const observations = [];
  let propertiesWithMultipleObservedAttempts = 0;
  let maxObservedAttemptsPerProperty = 0;
  for (const [key, events] of grouped) {
    maxObservedAttemptsPerProperty = Math.max(maxObservedAttemptsPerProperty, events.length);
    if (events.length < 2) continue;
    propertiesWithMultipleObservedAttempts++;
    for (const event of events.slice(1)) {
      observations.push({
        propertyKey: key,
        date: event.date,
        observedSequence: event.observedSequence,
        outcome: event.outcome,
      });
    }
  }
  return {
    propertiesWithObservedAttempts: grouped.size,
    propertiesWithMultipleObservedAttempts,
    observedAttemptsAfterFirst: observations.length,
    maxObservedAttemptsPerProperty,
    observations,
  };
}

function elapsedAnalysis(grouped) {
  const observations = [];
  for (const [key, events] of grouped) {
    for (let index = 0; index < events.length - 1; index++) {
      const from = events[index];
      if (from.outcome !== 'unsold') continue;
      const to = events[index + 1];
      const days = Math.round((Date.parse(`${to.date}T00:00:00Z`) - Date.parse(`${from.date}T00:00:00Z`)) / DAY_MS);
      if (days <= 0) continue;
      observations.push({
        propertyKey: key,
        fromDate: from.date,
        toDate: to.date,
        elapsedDays: days,
        nextObservedOutcome: to.outcome,
      });
    }
  }
  return { summaryDays: numericSummary(observations.map((item) => item.elapsedDays)), observations };
}

function priceTrajectories(grouped) {
  const trajectories = [];
  for (const [key, events] of grouped) {
    const points = events.filter((event) => event.publishedStartingPricePln != null).map((event) => ({
      date: event.date,
      observedSequence: event.observedSequence,
      publishedStartingPricePln: event.publishedStartingPricePln,
    }));
    if (points.length < 2) continue;
    const changes = [];
    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1];
      const to = points[index];
      const changePln = to.publishedStartingPricePln - from.publishedStartingPricePln;
      changes.push({
        fromDate: from.date,
        toDate: to.date,
        fromObservedSequence: from.observedSequence,
        toObservedSequence: to.observedSequence,
        fromPublishedStartingPricePln: from.publishedStartingPricePln,
        toPublishedStartingPricePln: to.publishedStartingPricePln,
        changePln,
        changePercentage: Math.round((changePln * 1000) / from.publishedStartingPricePln) / 10,
      });
    }
    trajectories.push({ propertyKey: key, points, changes });
  }
  return trajectories;
}

function priceChangesAfterExplicitlyUnsold(grouped) {
  const observations = [];
  for (const [key, events] of grouped) {
    for (let index = 0; index < events.length - 1; index++) {
      const from = events[index];
      const to = events[index + 1];
      if (
        from.outcome !== 'unsold'
        || from.publishedStartingPricePln == null
        || to.publishedStartingPricePln == null
      ) continue;
      const changePln = to.publishedStartingPricePln - from.publishedStartingPricePln;
      observations.push({
        propertyKey: key,
        fromDate: from.date,
        toDate: to.date,
        fromPublishedStartingPricePln: from.publishedStartingPricePln,
        toPublishedStartingPricePln: to.publishedStartingPricePln,
        changePln,
        changePercentage: Math.round((changePln * 1000) / from.publishedStartingPricePln) / 10,
        nextObservedOutcome: to.outcome,
      });
    }
  }
  return {
    summaryPln: numericSummary(observations.map((item) => item.changePln)),
    summaryPercentage: numericSummary(observations.map((item) => item.changePercentage)),
    observations,
  };
}

function noDepositAnalysis(events) {
  const explicitlyUnsold = events.filter((event) => event.outcome === 'unsold');
  const isNormalizedPublishedReason = (reason) => reason && !['unknown', 'unclassified'].includes(reason);
  const withPublishedReason = explicitlyUnsold.filter((event) => (
    event.unsoldReasonCategories.some(isNormalizedPublishedReason)
  ));
  const noDeposits = explicitlyUnsold.filter((event) => event.unsoldReasonCategories.includes('no_deposits'));
  return {
    explicitlyUnsoldObservedAttempts: explicitlyUnsold.length,
    explicitlyUnsoldWithPublishedReason: withPublishedReason.length,
    explicitlyUnsoldWithNoDeposits: noDeposits.length,
    noDepositShareAmongExplicitlyUnsold: ratio(noDeposits.length, explicitlyUnsold.length),
    normalizedReasonCoverageAmongExplicitlyUnsold: ratio(withPublishedReason.length, explicitlyUnsold.length),
    // Compatibility alias; coverage is deliberately limited to the explicit,
    // normalized taxonomy above rather than arbitrary non-empty parser tokens.
    reasonCoverageAmongExplicitlyUnsold: ratio(withPublishedReason.length, explicitlyUnsold.length),
    observations: noDeposits.map((event) => ({ propertyKey: event.propertyKey, date: event.date })),
  };
}

function provenanceAnalysis(rows, events) {
  const rawRowsWithSource = rows.filter((row) => row.sources.length > 0).length;
  const eventsWithSource = events.filter((event) => event.sourceUrls.length > 0).length;
  const decided = events.filter((event) => event.outcome !== 'unknown');
  const decidedWithSource = decided.filter((event) => event.sourceUrls.length > 0).length;
  const decidedWithOutcomeSource = decided.filter((event) => event.outcomeSourceUrls.length > 0).length;
  const uniqueUrls = [...new Set(events.flatMap((event) => event.sourceUrls))].sort();
  const sourceFieldCounts = Object.fromEntries(SOURCE_FIELDS.map((field) => [field, 0]));
  for (const row of rows) {
    for (const field of new Set(row.sources.map((source) => source.field))) sourceFieldCounts[field]++;
  }
  return {
    sourceFieldsConsidered: [...SOURCE_FIELDS],
    rawRowSourceCoverage: ratio(rawRowsWithSource, rows.length),
    observedAttemptSourceCoverage: ratio(eventsWithSource, events.length),
    decidedObservedAttemptSourceCoverage: ratio(decidedWithSource, decided.length),
    decidedOutcomeSourceCoverage: ratio(decidedWithOutcomeSource, decided.length),
    sourceFieldRawRowCounts: sourceFieldCounts,
    uniqueSourceUrlCount: uniqueUrls.length,
    uniqueSourceUrls: uniqueUrls,
  };
}

function roundFieldAnalysis(events) {
  const counts = { explicit: 0, inferred: 0, unverified: 0, unknown: 0, conflicting: 0 };
  for (const event of events) counts[event.reportedRoundEvidence]++;
  return {
    counts,
    denominator: events.length,
    note: 'Reported round is display-only; observedSequence, repeat counts, and elapsed time use distinct chronological event dates.',
  };
}

function readinessAnalysis(counts, provenance, {
  minimumDecided,
  minimumEachOutcome,
  minimumSourceCoverage,
  maximumUnknownShare,
}) {
  const decidedCoverage = provenance.decidedOutcomeSourceCoverage;
  const unknownShare = ratio(counts.unknown, counts.total);
  const checks = {
    decidedSample: {
      passed: counts.decided >= minimumDecided,
      actual: counts.decided,
      minimum: minimumDecided,
    },
    soldAndUnsoldBalance: {
      passed: counts.sold >= minimumEachOutcome && counts.unsold >= minimumEachOutcome,
      sold: counts.sold,
      unsold: counts.unsold,
      minimumEach: minimumEachOutcome,
    },
    decidedSourceCoverage: {
      passed: decidedCoverage.rate != null && decidedCoverage.rate >= minimumSourceCoverage,
      ...decidedCoverage,
      minimumRate: minimumSourceCoverage,
      minimumPercentage: minimumSourceCoverage * 100,
    },
    unknownOutcomeShare: {
      passed: unknownShare.rate != null && unknownShare.rate <= maximumUnknownShare,
      ...unknownShare,
      maximumRate: maximumUnknownShare,
      maximumPercentage: maximumUnknownShare * 100,
    },
  };
  const reasons = [];
  if (!checks.decidedSample.passed) {
    reasons.push(`Only ${counts.decided} decided observed attempts; minimum is ${minimumDecided}.`);
  }
  if (!checks.soldAndUnsoldBalance.passed) {
    reasons.push(`Outcome balance requires at least ${minimumEachOutcome} sold and ${minimumEachOutcome} unsold observed attempts; found ${counts.sold} and ${counts.unsold}.`);
  }
  if (!checks.decidedSourceCoverage.passed) {
    reasons.push(`Decided source-link coverage is ${decidedCoverage.percentage ?? 'unknown'}%; minimum is ${minimumSourceCoverage * 100}%.`);
  }
  if (!checks.unknownOutcomeShare.passed) {
    reasons.push(`Unknown outcome share is ${unknownShare.percentage ?? 'unknown'}%; maximum is ${maximumUnknownShare * 100}%.`);
  }
  const ready = Object.values(checks).every((check) => check.passed);
  return {
    ready,
    status: ready ? 'ready' : (checks.decidedSample.passed ? 'not_ready' : 'insufficient_sample'),
    thresholds: {
      minimumDecidedObservedAttempts: minimumDecided,
      minimumEachSoldAndUnsold: minimumEachOutcome,
      minimumDecidedSourceCoverage: minimumSourceCoverage,
      maximumUnknownOutcomeShare: maximumUnknownShare,
    },
    checks,
    reasons,
  };
}

/**
 * Analyse one explicit asset class over one inclusive, fixed date range.
 *
 * @param {Array<object>} properties property records containing `listings` arrays
 * @param {{assetClass:string, from:string, to:string, excludedOwnerTypes?:string[], minimumDecided?:number,
 *   minimumEachOutcome?:number, minimumSourceCoverage?:number,
 *   maximumUnknownShare?:number}} options
 * @returns {object} JSON-serializable metrics plus normalized `events` rows for
 *   report/CSV generation. No current date, filesystem, locale, or input order
 *   affects the result.
 */
export function analyseB2G(properties, options = {}) {
  if (!Array.isArray(properties)) throw new TypeError('properties must be an array');
  const assetClass = typeof options.assetClass === 'string' ? options.assetClass.trim() : '';
  if (!assetClass) throw new TypeError('assetClass must be an explicit non-empty string');
  const from = requireDate(options.from, 'from');
  const to = requireDate(options.to, 'to');
  if (from.time > to.time) throw new RangeError('from must be on or before to');
  const minimumDecided = options.minimumDecided ?? DEFAULT_MINIMUM_DECIDED;
  if (!Number.isInteger(minimumDecided) || minimumDecided < 1) {
    throw new TypeError('minimumDecided must be a positive integer');
  }
  const minimumEachOutcome = options.minimumEachOutcome ?? DEFAULT_MINIMUM_EACH_OUTCOME;
  if (!Number.isInteger(minimumEachOutcome) || minimumEachOutcome < 1) {
    throw new TypeError('minimumEachOutcome must be a positive integer');
  }
  const minimumSourceCoverage = options.minimumSourceCoverage ?? DEFAULT_MINIMUM_SOURCE_COVERAGE;
  if (typeof minimumSourceCoverage !== 'number' || minimumSourceCoverage < 0 || minimumSourceCoverage > 1) {
    throw new TypeError('minimumSourceCoverage must be a number between 0 and 1');
  }
  const maximumUnknownShare = options.maximumUnknownShare ?? DEFAULT_MAXIMUM_UNKNOWN_SHARE;
  if (typeof maximumUnknownShare !== 'number' || maximumUnknownShare < 0 || maximumUnknownShare > 1) {
    throw new TypeError('maximumUnknownShare must be a number between 0 and 1');
  }
  const excludedOwnerTypes = options.excludedOwnerTypes ?? [];
  if (!Array.isArray(excludedOwnerTypes) || excludedOwnerTypes.some((value) => (
    typeof value !== 'string' || !value.trim()
  ))) throw new TypeError('excludedOwnerTypes must be an array of non-empty strings');
  const normalizedExcludedOwnerTypes = [...new Set(excludedOwnerTypes.map((value) => value.trim()))].sort(compareText);

  const selected = selectionRows(properties, assetClass, from, to, new Set(normalizedExcludedOwnerTypes));
  const events = buildEvents(selected.rows, assetClass);
  const grouped = eventsByProperty(events);
  const counts = outcomeCounts(events);
  const observedDates = events.map((event) => event.date).sort();
  const provenance = provenanceAnalysis(selected.rows, events);
  const readiness = readinessAnalysis(counts, provenance, {
    minimumDecided,
    minimumEachOutcome,
    minimumSourceCoverage,
    maximumUnknownShare,
  });

  const fingerprintPayload = {
    schemaVersion: B2G_ANALYSIS_SCHEMA_VERSION,
    scope: {
      assetClass,
      from: from.value,
      to: to.value,
      dateRange: 'inclusive',
      excludedOwnerTypes: normalizedExcludedOwnerTypes,
    },
    // Fingerprint the normalized selected inputs (rather than the aggregate), so
    // an archived→active source change or a same-date duplicate is still visible
    // even when it remains in the same conservative `unknown` outcome bucket.
    selectedRows: selected.rows.map(({ dateTime, ...row }) => row),
  };

  return {
    schemaVersion: B2G_ANALYSIS_SCHEMA_VERSION,
    inputFingerprint: `sha256:${sha256(fingerprintPayload)}`,
    scope: {
      assetClass,
      from: from.value,
      to: to.value,
      dateRange: 'inclusive',
      excludedOwnerTypes: normalizedExcludedOwnerTypes,
      observedFrom: observedDates[0] ?? null,
      observedTo: observedDates.at(-1) ?? null,
    },
    selection: {
      ...selected.stats,
      includedRawListingRows: selected.rows.length,
      includedObservedAttempts: events.length,
      includedProperties: grouped.size,
      foldedDuplicateRows: selected.rows.length - events.length,
    },
    outcomes: {
      counts,
      sellThroughAmongDecided: ratio(counts.sold, counts.decided),
      unsoldShareAmongDecided: ratio(counts.unsold, counts.decided),
      unknownShareAmongObserved: ratio(counts.unknown, counts.total),
    },
    byYear: byYear(events),
    repeatedAttempts: repeatedAttemptAnalysis(grouped),
    elapsedAfterExplicitlyUnsold: elapsedAnalysis(grouped),
    publishedStartingPriceTrajectories: priceTrajectories(grouped),
    publishedStartingPriceChangesAfterExplicitlyUnsold: priceChangesAfterExplicitlyUnsold(grouped),
    noDeposit: noDepositAnalysis(events),
    provenance,
    roundField: roundFieldAnalysis(events),
    readiness,
    events,
  };
}

// US-spelling alias for callers that use `analyze` elsewhere.
export const analyzeB2G = analyseB2G;
