#!/usr/bin/env node

// Build the canonical city manifest from official GUS TERYT TERC/SIMC data.
// No npm dependencies: GitHub-hosted Ubuntu supplies `unzip`, and Node 20
// supplies fetch/Web APIs. The official download is kept in a read-only job;
// only generated JSON/Markdown crosses into the publisher job.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OFFICIAL_PAGE = 'https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne.aspx?contrast=default';
const STRUCTURE_DOC = 'https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne_struktury.aspx';
const DOWNLOAD_TARGETS = {
  terc: 'ctl00$body$BTERCUrzedowyPobierz',
  simc: 'ctl00$body$BSIMCUrzedowyPobierz',
  wmrodz: 'ctl00$body$BRodzMiejPobierz',
};

const WOJ_SLUG = {
  '02': 'dolnoslaskie', '04': 'kujawsko-pomorskie', '06': 'lubelskie',
  '08': 'lubuskie', '10': 'lodzkie', '12': 'malopolskie',
  '14': 'mazowieckie', '16': 'opolskie', '18': 'podkarpackie',
  '20': 'podlaskie', '22': 'pomorskie', '24': 'slaskie',
  '26': 'swietokrzyskie', '28': 'warminsko-mazurskie',
  '30': 'wielkopolskie', '32': 'zachodniopomorskie',
};

const HISTORIC_STATUS = new Set([
  'built', 'build', 'verify', 'no-build', 'dropped', 'deferred', 'unresearched',
]);

const statusLifecycle = (status, pipelineId = null) => {
  if (pipelineId) {
    return { research: 'surveyed', implementation: 'enabled', runtime: 'monitored' };
  }
  const implementation = {
    build: 'ready', verify: 'researching', 'no-build': 'no-source-found',
    dropped: 'deferred', deferred: 'deferred', built: 'blocked',
  }[status] || 'unresearched';
  return {
    research: status && status !== 'unresearched' ? 'surveyed' : 'unresearched',
    implementation,
    runtime: 'not-enabled',
  };
};

const emptyCapabilities = () => ({
  cms_family: 'unknown',
  accessibility: 'unknown',
  coverage_period: { from: null, to: null },
  assets: {
    residential: 'unknown', land: 'unknown', building: 'unknown',
    commercial: 'unknown', garage: 'unknown',
  },
  procedures: {
    oral_auction: 'unknown', written_auction: 'unknown', negotiations: 'unknown',
  },
  announcements: 'unknown',
  results: 'unknown',
});

function addDays(isoDate, days) {
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(time)) return null;
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function fold(value = '') {
  return String(value)
    .replace(/[łŁ]/g, (m) => (m === 'Ł' ? 'L' : 'l'))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseDelimited(text, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) throw new Error('empty delimited input');
  const headers = rows.shift().map((v) => v.trim());
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

function readDataset(path) {
  const bytes = readFileSync(path);
  if (extname(path).toLowerCase() !== '.zip') {
    return { csv: bytes.toString('utf8'), archive_sha256: null, csv_name: basename(path) };
  }
  const list = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' })
    .split('\n').map((line) => line.trim()).filter((line) => /\.csv$/i.test(line));
  if (list.length !== 1) throw new Error(`${path}: expected exactly one CSV, got ${list.length}`);
  const csvBytes = execFileSync('unzip', ['-p', path, list[0]], { maxBuffer: 64 * 1024 * 1024 });
  return { csv: csvBytes.toString('utf8'), archive_sha256: sha256(bytes), csv_name: list[0] };
}

function extractHiddenInputs(html) {
  const values = {};
  for (const tag of html.match(/<input\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[match[1].toLowerCase()] = (match[2] ?? match[3] ?? '')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    if (attrs.type === 'hidden' && attrs.name) values[attrs.name] = attrs.value || '';
  }
  if (!values.__VIEWSTATE) throw new Error('official download page did not contain ASP.NET view state');
  return values;
}

function dispositionFilename(value, fallback) {
  const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(value || '');
  return match ? decodeURIComponent(match[1].replace(/"$/, '')) : fallback;
}

export async function downloadOfficial(outDir, fetchImpl = fetch) {
  mkdirSync(outDir, { recursive: true });
  const pageResponse = await fetchImpl(OFFICIAL_PAGE, { redirect: 'follow' });
  if (!pageResponse.ok) throw new Error(`official page returned HTTP ${pageResponse.status}`);
  const pageHtml = await pageResponse.text();
  const cookie = pageResponse.headers.getSetCookie?.().map((v) => v.split(';')[0]).join('; ') || '';
  const downloaded = {};
  for (const [kind, eventTarget] of Object.entries(DOWNLOAD_TARGETS)) {
    const form = new URLSearchParams(extractHiddenInputs(pageHtml));
    form.set('__EVENTTARGET', eventTarget);
    form.set('__EVENTARGUMENT', '');
    const response = await fetchImpl(OFFICIAL_PAGE, {
      method: 'POST', redirect: 'follow',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...(cookie ? { cookie } : {}),
      },
      body: form,
    });
    if (!response.ok) throw new Error(`${kind} download returned HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!/zip/i.test(type)) throw new Error(`${kind} download returned ${type || 'unknown content type'}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 2).toString() !== 'PK') throw new Error(`${kind} download is not a ZIP archive`);
    const filename = basename(dispositionFilename(response.headers.get('content-disposition'), `${kind}.zip`));
    const path = join(outDir, filename);
    writeFileSync(path, bytes);
    downloaded[kind] = path;
  }
  return downloaded;
}

function key(...parts) { return parts.join('|'); }

function normalizePowiat(value = '') {
  return fold(value.replace(/^powiat\s+/i, '').replace(/\s*\(.*$/, ''));
}

function selectMasterMatch(official, candidates) {
  if (candidates.length <= 1) return candidates[0] || null;
  const byPowiat = candidates.filter((candidate) => {
    const oldPowiat = normalizePowiat(candidate.powiat_label || candidate.powiat_slug || '');
    const officialPowiat = normalizePowiat(official.powiat_name || '');
    return oldPowiat && officialPowiat && (oldPowiat === officialPowiat || oldPowiat.includes(officialPowiat));
  });
  return byPowiat.length === 1 ? byPowiat[0] : null;
}

function pipelineLookup(dataIndex) {
  const lookup = new Map();
  for (const city of dataIndex.cities || []) {
    const k = key(fold(city.label), city.voivodeship);
    if (lookup.has(k)) throw new Error(`ambiguous pipeline label/voivodeship: ${city.label}`);
    lookup.set(k, city);
  }
  return lookup;
}

function assignIds(rows, matched) {
  const labelCounts = new Map();
  for (const row of rows) labelCounts.set(fold(row.label), (labelCounts.get(fold(row.label)) || 0) + 1);
  const used = new Set();
  const ids = new Map();
  for (const row of rows) {
    const old = matched.get(row.simc);
    let id = old?.id || fold(row.label);
    if (!old && labelCounts.get(fold(row.label)) > 1) id = `${id}-${row.simc}`;
    if (used.has(id)) id = `${id}-${row.simc}`;
    if (used.has(id)) throw new Error(`could not assign unique id for SIMC ${row.simc}`);
    used.add(id); ids.set(row.simc, id);
  }
  return ids;
}

export function buildInventory({
  tercCsv, simcCsv, wmrodzCsv, legacyMaster, dataIndex, source, expectedCityCount = 1026,
}) {
  const terc = parseDelimited(tercCsv);
  const simc = parseDelimited(simcCsv);
  const wmrodz = parseDelimited(wmrodzCsv);
  const cityKind = wmrodz.find((row) => row.RM === '96');
  if (!cityKind || fold(cityKind.NAZWA_RM) !== 'miasto') throw new Error('WMRODZ does not define RM=96 as miasto');

  const tercByUnit = new Map();
  const wojByCode = new Map();
  const powiatByCode = new Map();
  for (const row of terc) {
    if (row.WOJ && !row.POW && !row.GMI) wojByCode.set(row.WOJ, row);
    if (row.WOJ && row.POW && !row.GMI) powiatByCode.set(key(row.WOJ, row.POW), row);
    if (row.WOJ && row.POW && row.GMI && row.RODZ) {
      tercByUnit.set(key(row.WOJ, row.POW, row.GMI, row.RODZ), row);
    }
  }

  const official = simc.filter((row) => row.RM === '96').map((row) => {
    if (!/^\d{7}$/.test(row.SYM) || row.SYM !== row.SYMPOD) {
      throw new Error(`invalid city SIMC identity: ${row.NAZWA} ${row.SYM}/${row.SYMPOD}`);
    }
    const unit = tercByUnit.get(key(row.WOJ, row.POW, row.GMI, row.RODZ_GMI));
    const woj = wojByCode.get(row.WOJ);
    const powiat = powiatByCode.get(key(row.WOJ, row.POW));
    if (!unit || !woj || !powiat) throw new Error(`TERC join failed for SIMC ${row.SYM} (${row.NAZWA})`);
    const voivodeship = WOJ_SLUG[row.WOJ];
    if (!voivodeship) throw new Error(`unknown voivodeship code ${row.WOJ}`);
    return {
      simc: row.SYM,
      label: row.NAZWA,
      effective_date: row.STAN_NA,
      voivodeship,
      voivodeship_name: woj.NAZWA,
      powiat_code: `${row.WOJ}${row.POW}`,
      powiat_name: powiat.NAZWA,
      gmina_code: `${row.WOJ}${row.POW}${row.GMI}${row.RODZ_GMI}`,
      gmina_name: unit.NAZWA,
      gmina_kind: unit.NAZWA_DOD,
      terc_kind: row.RODZ_GMI,
    };
  }).sort((a, b) => a.simc.localeCompare(b.simc));

  if (official.length !== expectedCityCount) throw new Error(`expected ${expectedCityCount} official cities, got ${official.length}`);
  const dates = new Set(official.map((row) => row.effective_date));
  if (dates.size !== 1) throw new Error(`SIMC cities have inconsistent effective dates: ${[...dates].join(', ')}`);

  const legacyCandidates = new Map();
  const legacyBySimc = new Map();
  const legacyHistoric = (legacyMaster.cities || []).filter((city) => (
    city.status !== 'unresearched' || city.path || city.spike
  ));
  for (const city of legacyMaster.cities || []) {
    if (!HISTORIC_STATUS.has(city.status)) throw new Error(`unknown historic status ${city.status} for ${city.id}`);
    const k = key(fold(city.label), city.voivodeship);
    if (!legacyCandidates.has(k)) legacyCandidates.set(k, []);
    legacyCandidates.get(k).push(city);
    if (city.official?.simc) legacyBySimc.set(city.official.simc, city);
  }

  const matched = new Map();
  const matchedLegacy = new Set();
  const ambiguousLegacy = [];
  for (const row of official) {
    const candidates = legacyCandidates.get(key(fold(row.label), row.voivodeship)) || [];
    const match = legacyBySimc.get(row.simc) || selectMasterMatch(row, candidates);
    if (match) {
      if (matchedLegacy.has(match.id)) throw new Error(`legacy city matched twice: ${match.id}`);
      matched.set(row.simc, match); matchedLegacy.add(match.id);
    } else if (candidates.length) ambiguousLegacy.push({ simc: row.simc, label: row.label, candidates: candidates.map((c) => c.id) });
  }

  const ids = assignIds(official, matched);
  const pipeline = pipelineLookup(dataIndex);
  const matchedPipeline = new Set();
  const cities = official.map((row) => {
    const old = matched.get(row.simc);
    const pipelineCity = pipeline.get(key(fold(row.label), row.voivodeship)) || null;
    const pipelineId = pipelineCity?.id || null;
    if (pipelineId) matchedPipeline.add(pipelineId);
    const id = ids.get(row.simc);
    const aliases = new Set(old?.aliases || []);
    if (old && old.id !== id) aliases.add(old.id);
    if (pipelineId && pipelineId !== id) aliases.add(pipelineId);
    return {
      ...(old || {}),
      id,
      label: row.label,
      voivodeship: row.voivodeship,
      status: old?.status || 'unresearched',
      path: old?.path || null,
      spike: old?.spike || null,
      official: {
        simc: row.simc,
        terc_gmina: row.gmina_code,
        terc_powiat: row.powiat_code,
        effective_date: row.effective_date,
        voivodeship_name: row.voivodeship_name,
        powiat_name: row.powiat_name,
        gmina_name: row.gmina_name,
        gmina_kind: row.gmina_kind,
      },
      aliases: [...aliases].sort(),
      pipeline_id: pipelineId,
      seller: old?.seller || {
        name: pipelineCity?.authority || null,
        source_host: pipelineCity?.host || null,
      },
      lifecycle: statusLifecycle(old?.status || null, pipelineId),
      capabilities: { ...emptyCapabilities(), ...(old?.capabilities || {}) },
      sources: (old?.sources || (old?.path ? [{
        evidence_path: old.path,
        verified_at: legacyMaster.generated_at,
      }] : [])).map((item) => ({
        ...item,
        verified_at: item.verified_at || old?.review?.last_reviewed || (old ? legacyMaster.generated_at : null),
      })),
      review: {
        last_reviewed: old?.review?.last_reviewed || (old?.status !== 'unresearched' ? legacyMaster.generated_at : null),
        review_due: old?.review?.review_due || addDays(
          old?.review?.last_reviewed || (old?.status !== 'unresearched' ? legacyMaster.generated_at : null), 90,
        ),
      },
    };
  });

  const unmatchedLegacy = legacyHistoric.filter((city) => !matchedLegacy.has(city.id)).map((city) => city.id);
  const unmatchedPipeline = (dataIndex.cities || []).filter((city) => !matchedPipeline.has(city.id)).map((city) => city.id);
  const citiesByLabel = new Map();
  for (const city of cities) {
    const labelKey = fold(city.label);
    if (!citiesByLabel.has(labelKey)) citiesByLabel.set(labelKey, []);
    citiesByLabel.get(labelKey).push(city);
  }
  const duplicateLabels = [...citiesByLabel.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([label_key, group]) => ({
      label_key,
      cities: group.map((city) => ({ id: city.id, label: city.label, simc: city.official.simc, voivodeship: city.voivodeship })),
    }));

  const manifest = {
    schema: 'city-manifest/2',
    generated_at: source.retrieved_at,
    note: 'Canonical official-city inventory. Historic spike verdicts are preserved in status/spike; lifecycle and capabilities are separate.',
    source,
    total: cities.length,
    cities,
  };
  const discrepancies = {
    schema: 'city-discrepancies/1',
    generated_at: source.retrieved_at,
    official_cities: cities.length,
    historic_entries: legacyHistoric.length,
    enabled_pipeline_cities: (dataIndex.cities || []).length,
    unmatched_historic_entries: unmatchedLegacy,
    ambiguous_historic_matches: ambiguousLegacy,
    unmatched_pipeline_cities: unmatchedPipeline,
    duplicate_official_labels: duplicateLabels,
  };
  return { manifest, discrepancies };
}

function matchOfficialCity(city, manifest) {
  const candidates = manifest.cities.filter((candidate) =>
    fold(candidate.label) === fold(city.label) && candidate.voivodeship === city.voivodeship);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const powiat = normalizePowiat(city.powiat_label || city.powiat_slug || '');
    const byPowiat = candidates.filter((candidate) => normalizePowiat(candidate.official.powiat_name) === powiat);
    if (byPowiat.length === 1) return byPowiat[0];
  }
  return null;
}

export function reconcileBacklog(backlog, manifest) {
  const evidenceByCity = new Map(manifest.cities.filter((city) => city.path).map((city) => [city.official.simc, city.path]));
  const unresolved = [];
  const cities = (backlog.cities || []).map((entry) => {
    const official = matchOfficialCity(entry, manifest);
    if (!official) {
      unresolved.push({ label: entry.label, voivodeship: entry.voivodeship, powiat_slug: entry.powiat_slug });
      return entry;
    }
    const canonical = evidenceByCity.get(official.official.simc) || null;
    const currentExists = entry.spike_path && existsSync(join(REPO, entry.spike_path));
    const next = {
      ...entry,
      city_id: official.id,
      city_simc: official.official.simc,
      canonical_spike_path: canonical,
    };
    if (!currentExists && canonical) {
      next.spike_path_original = entry.spike_path;
      next.spike_path = canonical;
    }
    return next;
  });
  const distinct = new Set(cities.map((city) => city.city_simc).filter(Boolean));
  return {
    backlog: {
      ...backlog,
      schema: 'powiat-backlog/2',
      distinct_city_count: distinct.size,
      cities,
    },
    unresolved,
  };
}

export function verifyInventory({
  manifest, backlog, discrepancies, dataIndex, checkPaths = true, expectedCityCount = 1026,
}) {
  const errors = [];
  if (manifest.schema !== 'city-manifest/2') errors.push('unexpected city manifest schema');
  if (manifest.total !== expectedCityCount || manifest.cities?.length !== expectedCityCount) {
    errors.push(`city manifest must contain ${expectedCityCount} cities`);
  }
  const ids = new Set(); const simc = new Set(); const aliasOwners = new Map();
  for (const city of manifest.cities || []) {
    if (ids.has(city.id)) errors.push(`duplicate city id: ${city.id}`); ids.add(city.id);
    if (simc.has(city.official?.simc)) errors.push(`duplicate SIMC: ${city.official?.simc}`); simc.add(city.official?.simc);
    if (!/^\d{7}$/.test(city.official?.simc || '')) errors.push(`invalid SIMC for ${city.id}`);
    if (!city.lifecycle || !city.capabilities || !Array.isArray(city.sources)) errors.push(`missing coverage contract for ${city.id}`);
    if (!city.capabilities?.coverage_period || !('accessibility' in (city.capabilities || {})) || !('cms_family' in (city.capabilities || {}))) {
      errors.push(`incomplete capability contract for ${city.id}`);
    }
    if (city.lifecycle?.research === 'surveyed' && (!(city.sources || []).length || !city.review?.review_due)) {
      errors.push(`surveyed city lacks evidence or review deadline: ${city.id}`);
    }
    for (const alias of city.aliases || []) {
      if (typeof alias !== 'string' || !alias) errors.push(`invalid alias for ${city.id}`);
      if (aliasOwners.has(alias) && aliasOwners.get(alias) !== city.id) errors.push(`alias ${alias} maps to multiple cities`);
      aliasOwners.set(alias, city.id);
    }
    for (const sourceEntry of city.sources || []) {
      if (checkPaths && sourceEntry.evidence_path && !existsSync(join(REPO, sourceEntry.evidence_path))) {
        errors.push(`source evidence missing for ${city.id}: ${sourceEntry.evidence_path}`);
      }
    }
    if (checkPaths && city.path && !existsSync(join(REPO, city.path))) errors.push(`missing evidence path for ${city.id}: ${city.path}`);
  }
  for (const [alias, owner] of aliasOwners) {
    if (ids.has(alias) && alias !== owner) errors.push(`alias ${alias} conflicts with a canonical city id`);
  }
  for (const city of dataIndex.cities || []) {
    const matches = manifest.cities.filter((candidate) => candidate.pipeline_id === city.id);
    if (matches.length !== 1) errors.push(`pipeline id ${city.id} maps to ${matches.length} official cities`);
  }
  if (backlog.total !== backlog.cities?.length) errors.push('backlog total does not match rows');
  for (const entry of backlog.cities || []) {
    if (!entry.city_simc || !simc.has(entry.city_simc)) errors.push(`backlog entry unresolved: ${entry.label}`);
    if (checkPaths && entry.spike_path && !existsSync(join(REPO, entry.spike_path))) errors.push(`backlog evidence missing: ${entry.spike_path}`);
  }
  for (const field of ['unmatched_historic_entries', 'ambiguous_historic_matches', 'unmatched_pipeline_cities', 'unresolved_backlog_entries']) {
    if (discrepancies[field]?.length) errors.push(`${field}: ${JSON.stringify(discrepancies[field])}`);
  }
  if (errors.length) throw new Error(`inventory verification failed:\n- ${errors.join('\n- ')}`);
  return { cities: manifest.cities.length, pipeline: dataIndex.cities.length, backlog: backlog.cities.length };
}

function discrepancyMarkdown(discrepancies, backlogInfo) {
  const lines = [
    '# National city inventory discrepancy report', '',
    '> Generated by `spikes/inventory/import-teryt.mjs`; do not hand-edit.', '',
    `- Official cities (SIMC RM=96): **${discrepancies.official_cities}**`,
    `- Preserved historic city entries: **${discrepancies.historic_entries}**`,
    `- Enabled pipeline cities reconciled: **${discrepancies.enabled_pipeline_cities}**`,
    `- Powiat rows reconciled: **${backlogInfo.rows}**`,
    `- Distinct powiat-seat cities: **${backlogInfo.distinct}**`,
    `- Duplicate official names requiring SIMC-backed identities: **${discrepancies.duplicate_official_labels.length}**`, '',
    '## Blocking discrepancies', '',
  ];
  const blockers = [
    ['Unmatched historic entries', discrepancies.unmatched_historic_entries],
    ['Ambiguous historic matches', discrepancies.ambiguous_historic_matches],
    ['Unmatched enabled pipeline cities', discrepancies.unmatched_pipeline_cities],
    ['Unresolved powiat backlog entries', discrepancies.unresolved_backlog_entries],
  ];
  if (blockers.every(([, values]) => values.length === 0)) lines.push('None.');
  else for (const [label, values] of blockers) if (values.length) lines.push(`- ${label}: \`${JSON.stringify(values)}\``);
  lines.push('', '## Duplicate-name identities', '', '| Name key | Official identities |', '|---|---|');
  for (const duplicate of discrepancies.duplicate_official_labels) {
    lines.push(`| ${duplicate.label_key} | ${duplicate.cities.map((c) => `${c.label} (${c.voivodeship}, SIMC ${c.simc}, \`${c.id}\`)`).join('<br>')} |`);
  }
  return `${lines.join('\n')}\n`;
}

function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }

async function refresh(args) {
  let tercPath = args.terc; let simcPath = args.simc; let wmrodzPath = args.wmrodz;
  if (!tercPath || !simcPath || !wmrodzPath) {
    const downloaded = await downloadOfficial(args.downloadDir || mkdtempSync(join(tmpdir(), 'teryt-')));
    tercPath = downloaded.terc; simcPath = downloaded.simc; wmrodzPath = downloaded.wmrodz;
  }
  const tercData = readDataset(tercPath);
  const simcData = readDataset(simcPath);
  const wmrodzData = readDataset(wmrodzPath);
  const legacyMaster = JSON.parse(readFileSync(args.master || join(REPO, 'spikes/master-cities.json'), 'utf8'));
  const backlogInput = JSON.parse(readFileSync(args.backlog || join(REPO, 'spikes/backlog.json'), 'utf8'));
  const dataIndex = JSON.parse(readFileSync(join(REPO, 'data/index.json'), 'utf8'));
  const effectiveDates = new Set(parseDelimited(simcData.csv).filter((row) => row.RM === '96').map((row) => row.STAN_NA));
  if (effectiveDates.size !== 1) throw new Error('could not determine one SIMC city effective date');
  const retrievedAt = args.retrievedAt || new Date().toISOString().slice(0, 10);
  const source = {
    publisher: 'Główny Urząd Statystyczny, rejestr TERYT',
    source_page: OFFICIAL_PAGE,
    structure_documentation: STRUCTURE_DOC,
    retrieved_at: retrievedAt,
    effective_date: [...effectiveDates][0],
    files: {
      terc: { filename: basename(tercPath), archive_sha256: tercData.archive_sha256, csv_filename: tercData.csv_name, csv_sha256: sha256(Buffer.from(tercData.csv)) },
      simc: { filename: basename(simcPath), archive_sha256: simcData.archive_sha256, csv_filename: simcData.csv_name, csv_sha256: sha256(Buffer.from(simcData.csv)) },
      wmrodz: { filename: basename(wmrodzPath), archive_sha256: wmrodzData.archive_sha256, csv_filename: wmrodzData.csv_name, csv_sha256: sha256(Buffer.from(wmrodzData.csv)) },
    },
  };
  const { manifest, discrepancies } = buildInventory({
    tercCsv: tercData.csv, simcCsv: simcData.csv, wmrodzCsv: wmrodzData.csv,
    legacyMaster, dataIndex, source,
  });
  const { backlog, unresolved } = reconcileBacklog(backlogInput, manifest);
  discrepancies.unresolved_backlog_entries = unresolved;
  verifyInventory({ manifest, backlog, discrepancies, dataIndex });
  mkdirSync(join(REPO, 'spikes/inventory'), { recursive: true });
  writeFileSync(join(REPO, 'spikes/master-cities.json'), stableJson(manifest));
  writeFileSync(join(REPO, 'spikes/backlog.json'), stableJson(backlog));
  writeFileSync(join(REPO, 'spikes/inventory/source-manifest.json'), stableJson(source));
  writeFileSync(join(REPO, 'spikes/inventory/discrepancies.json'), stableJson(discrepancies));
  writeFileSync(join(REPO, 'spikes/inventory/DISCREPANCIES.md'), discrepancyMarkdown(discrepancies, {
    rows: backlog.cities.length, distinct: backlog.distinct_city_count,
  }));
  console.error(`TERYT inventory written: ${manifest.cities.length} cities; ${dataIndex.cities.length} enabled; ${backlog.cities.length} powiat rows.`);
}

function verifyCommitted() {
  const manifest = JSON.parse(readFileSync(join(REPO, 'spikes/master-cities.json'), 'utf8'));
  const backlog = JSON.parse(readFileSync(join(REPO, 'spikes/backlog.json'), 'utf8'));
  const discrepancies = JSON.parse(readFileSync(join(REPO, 'spikes/inventory/discrepancies.json'), 'utf8'));
  const dataIndex = JSON.parse(readFileSync(join(REPO, 'data/index.json'), 'utf8'));
  const source = JSON.parse(readFileSync(join(REPO, 'spikes/inventory/source-manifest.json'), 'utf8'));
  if (JSON.stringify(source) !== JSON.stringify(manifest.source)) throw new Error('source manifest differs from city manifest source block');
  const result = verifyInventory({ manifest, backlog, discrepancies, dataIndex });
  console.error(`TERYT inventory verified: ${result.cities} cities; ${result.pipeline} enabled; ${result.backlog} powiat rows.`);
}

function parseArgs(argv) {
  const result = { command: argv[0] || 'verify' };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`unexpected argument ${arg}`);
    const name = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${arg}`);
    result[name] = value; i += 1;
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'refresh') await refresh(args);
  else if (args.command === 'verify') verifyCommitted();
  else throw new Error('usage: import-teryt.mjs refresh [--terc file --simc file --wmrodz file] [--retrieved-at YYYY-MM-DD] | verify');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
