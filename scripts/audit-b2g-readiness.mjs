#!/usr/bin/env node
// Read-only B2G readiness audit over committed city data.
//
//   node scripts/audit-b2g-readiness.mjs \
//     --kind mieszkalny --from 2024-08-01 --to 2026-07-31 [--json] [city-id ...]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  analyseB2G,
  MUNICIPAL_EXCLUDED_OWNER_TYPES,
} from './lib/b2g-analysis.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function optionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}

export function parseReadinessArgs(argv) {
  const options = { cityIds: [], json: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--kind') options.assetClass = optionValue(argv, index++, arg);
    else if (arg === '--from') options.from = optionValue(argv, index++, arg);
    else if (arg === '--to') options.to = optionValue(argv, index++, arg);
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option: ${arg}`);
    else options.cityIds.push(arg);
  }
  if (!options.assetClass || !options.from || !options.to) {
    throw new Error('usage: node scripts/audit-b2g-readiness.mjs --kind <kind> --from YYYY-MM-DD --to YYYY-MM-DD [--json] [city-id ...]');
  }
  return options;
}

export function summarizeReadiness(city, meta, analysis) {
  const counts = analysis.outcomes.counts;
  const checks = analysis.readiness.checks;
  return {
    cityId: city.id,
    cityLabel: city.label,
    dataGeneratedAt: meta.generated_at ?? null,
    assetClass: analysis.scope.assetClass,
    from: analysis.scope.from,
    to: analysis.scope.to,
    ready: analysis.readiness.ready,
    status: analysis.readiness.status,
    observedAttempts: counts.total,
    decided: counts.decided,
    sold: counts.sold,
    unsold: counts.unsold,
    unknown: counts.unknown,
    unknownPercentage: checks.unknownOutcomeShare.percentage,
    decidedSourceCoveragePercentage: checks.decidedSourceCoverage.percentage,
    includedProperties: analysis.selection.includedProperties,
    uniqueSourceUrls: analysis.provenance.uniqueSourceUrlCount,
    reasons: analysis.readiness.reasons,
    inputFingerprint: analysis.inputFingerprint,
  };
}

export function auditCities({ index, loadCity, cityIds, assetClass, from, to }) {
  const requested = cityIds.length ? new Set(cityIds) : null;
  if (requested) {
    const known = new Set((index.cities || []).map((city) => city.id));
    const missing = [...requested].filter((id) => !known.has(id));
    if (missing.length) throw new Error(`unknown city id(s): ${missing.join(', ')}`);
  }
  const results = [];
  for (const city of index.cities || []) {
    if (requested && !requested.has(city.id)) continue;
    const loaded = loadCity(city.id);
    if (!loaded) continue;
    const analysis = analyseB2G(loaded.properties, {
      assetClass,
      from,
      to,
      excludedOwnerTypes: MUNICIPAL_EXCLUDED_OWNER_TYPES,
    });
    results.push(summarizeReadiness(city, loaded.meta, analysis));
  }
  return results.sort((left, right) => Number(right.ready) - Number(left.ready)
    || right.decided - left.decided || left.cityLabel.localeCompare(right.cityLabel, 'pl'));
}

function localCityLoader(cityId) {
  const propertiesPath = join(ROOT, 'data', cityId, 'properties.json');
  const metaPath = join(ROOT, 'data', cityId, 'meta.json');
  if (!existsSync(propertiesPath) || !existsSync(metaPath)) return null;
  return {
    properties: readJson(propertiesPath).properties || [],
    meta: readJson(metaPath),
  };
}

function formatPercentage(value) {
  return value == null ? '—' : `${Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`;
}

function printTable(results) {
  const rows = results.map((result) => ({
    miasto: result.cityLabel,
    gotowe: result.ready ? 'TAK' : 'NIE',
    rozstrzygniete: result.decided,
    sprzedano: result.sold,
    bez_nabywcy: result.unsold,
    nieznane: formatPercentage(result.unknownPercentage),
    zrodla: formatPercentage(result.decidedSourceCoveragePercentage),
    powod: result.reasons.join(' '),
  }));
  console.table(rows);
}

async function main() {
  const options = parseReadinessArgs(process.argv.slice(2));
  const index = readJson(join(ROOT, 'data', 'index.json'));
  const results = auditCities({
    index,
    loadCity: localCityLoader,
    cityIds: options.cityIds,
    assetClass: options.assetClass,
    from: options.from,
    to: options.to,
  });
  if (options.json) process.stdout.write(`${JSON.stringify({ scope: {
    assetClass: options.assetClass, from: options.from, to: options.to,
  }, results }, null, 2)}\n`);
  else printTable(results);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
