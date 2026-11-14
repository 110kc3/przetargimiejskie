import { repairLandLedger } from './core/ledger-repairs.js';

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDefaultResultOrder } from 'node:dns';

try { setDefaultResultOrder('ipv4first'); } catch {}

import { cities } from './cities/index.js';
import { ocrPdf } from './core/ocr-pdf.js';
import { pdfText } from './core/pdf-text.js';
import { buildCityData, healKinds, syncActiveListingRounds, todayWarsaw } from './core/build-properties.js';
import { applyDurablePropertyHeals, buildGlobalStreetDisplay } from './core/verified-heals.js';
import { buildLand, reconcileLandHistory } from './core/build-land.js';
import { LAND_KIND, normalizeKind } from './core/classify-kind.js';
import { mergeProperties, archiveAllActive, archivePastActive } from './core/merge-history.js';
import { closeBrowser } from './core/render.js';
import { validationPolicy } from '../scripts/validation-policy.js';

const MERGE_HISTORY = process.env.MERGE_HISTORY !== '0';

const SCHEMA_VERSION = 1;
const LAND_SCHEMA_VERSION = 1;
const PARSER_VERSION = '0.2.0';
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const PIPELINE_MIN_HISTORY_YEAR =
  Number(process.env.MIN_HISTORY_YEAR) || 2020;

function observedAssetClasses(properties, landCount) {
  const names = new Set();
  const mapped = {
    mieszkalny: 'residential', uzytkowy: 'commercial', garaz: 'garage',
    zabudowana: 'building', unknown: 'unknown',
  };
  for (const property of properties) names.add(mapped[property.kind] || property.kind || 'unknown');
  if (landCount > 0) names.add('land');
  return [...names].sort();
}

async function refreshCity(city, globalStreetDisplay = new Map()) {
  const attemptedAt = new Date().toISOString();
  console.error(`\n=== ${city.label} (${city.id}) ===`);

  if (process.env.FORCE_FAIL === city.id) {
    throw new Error('forced failure (triage E2E test)');
  }

  console.error('Crawling result documents ...');
  const crawlResultDocsFn = typeof city.crawlResultDocs === 'function'
    ? city.crawlResultDocs.bind(city)
    : typeof city.crawlResults === 'function'
    ? city.crawlResults.bind(city)
    : async () => [];
  const docRefs = await crawlResultDocsFn();
  console.error(`Found ${docRefs.length} result documents.\n`);

  console.error('OCR + parsing result documents (cached entries are instant) ...');
  const allRecords = [];
  let parsedNoteCount = 0;
  const parseResultDocFn = typeof city.parseResultDoc === 'function'
    ? city.parseResultDoc.bind(city)
    : typeof city.parseResult === 'function'
    ? (text, date, url) => city.parseResult(text, url)
    : () => [];
  for (const ref of docRefs) {
    let text;
    try {
      text = city.source === 'pdf' ? await ocrPdf(ref.pdf_url) : city.source === 'pdf-text' ? await pdfText(ref.pdf_url) : ref.text;
    } catch (err) {
      console.error(`  ERROR OCR ${ref.pdf_url}: ${err.message}`);
      continue;
    }
    const recs = parseResultDocFn(text, ref.auction_date, ref.pdf_url) || [];
    if (recs.length === 0) {
      console.error(`  WARN ${ref.auction_date}: parser returned 0 records from ${ref.pdf_url}`);
    }
    for (const r of recs) parsedNoteCount += r.notes?.length ?? 0;
    allRecords.push(...recs);
  }
  const beforeFloor = allRecords.length;
  const floored = allRecords.filter((r) => {
    if (!r.auction_date) return true;
    const yr = Number(r.auction_date.slice(0, 4));
    return !Number.isFinite(yr) || yr >= PIPELINE_MIN_HISTORY_YEAR;
  });
  allRecords.length = 0;
  allRecords.push(...floored);
  console.error(
    `Parsed ${beforeFloor} auction records, kept ${allRecords.length} after pipeline floor (>= ${PIPELINE_MIN_HISTORY_YEAR}) — ${parsedNoteCount} parser notes.\n`,
  );

  console.error('Crawling active listings + wykaz ...');
  const rawActiveCrawl = typeof city.crawlActive === 'function'
    ? await city.crawlActive()
    : typeof city.crawl === 'function'
    ? await city.crawl()
    : { listings: [], wykaz: [], land: [] };
  const activeCrawl = Array.isArray(rawActiveCrawl)
    ? {
        listings: rawActiveCrawl.filter((x) => x && x.type !== 'result'),
        wykaz: [],
        land: rawActiveCrawl.filter((x) => x && (x.kind === 'grunt' || x.type === 'land')),
      }
    : (rawActiveCrawl || { listings: [], wykaz: [], land: [] });
  const {
    listings: active = [],
    wykaz = [],
    land = [],
    valid_empty = false,
    valid_empty_land = false,
    land_complete: landComplete = true,
  } = activeCrawl;
  console.error(`Got ${active.length} active listings, ${wykaz.length} wykaz entries.\n`);

  const crawledActiveCount = active.length;
  const landRecords = [...land];
  for (const arr of [active, allRecords]) {
    const keep = [];
    for (const x of arr) (x.kind === LAND_KIND ? landRecords : keep).push(x);
    arr.length = 0;
    arr.push(...keep);
  }
  if (landRecords.length) {
    console.error(`  partitioned ${landRecords.length} land record(s) → land.json`);
  }

  if (city.enrichActive) await city.enrichActive(active);

  let detailAreas = new Map();
  if (city.crawlDetailAreas) {
    try {
      detailAreas = await city.crawlDetailAreas();
    } catch (err) {
      console.error('  WARN: detail-page enrichment failed:', err.message);
    }
  }

  const built = buildCityData({ allRecords, active, wykaz, detailAreas });
  let properties = built.properties;

  const propPath = join(DATA_DIR, city.id, 'properties.json');
  const metaPath = join(DATA_DIR, city.id, 'meta.json');
  let prevProperties = [];
  if (existsSync(propPath)) {
    try { prevProperties = JSON.parse(await readFile(propPath, 'utf8'))?.properties || []; }
    catch { prevProperties = []; }
  }
  let prevMeta = null;
  try { prevMeta = JSON.parse(await readFile(metaPath, 'utf8')); } catch {}

  const crawlEmpty = crawledActiveCount === 0 && beforeFloor === 0 && wykaz.length === 0 && landRecords.length === 0;
  const propertyCrawlEmpty = active.length === 0 && allRecords.length === 0 && wykaz.length === 0;
  const verifiedEmpty = propertyCrawlEmpty && valid_empty === true;
  if (verifiedEmpty) {
    console.error(`  ${city.id}: source was reached and explicitly reported no in-scope records — accepting a valid empty crawl.`);
  }
  if (crawlEmpty && !verifiedEmpty && prevProperties.length > 0) {
    console.error(
      `  ${city.id}: crawl returned EMPTY but ${prevProperties.length} properties were previously published — treating as a source outage. Preserving existing data.`,
    );
    console.error('TRIAGE ' + JSON.stringify({
      city: city.id, kind: 'empty-crawl', message: 'crawl returned empty',
      prev_properties: prevProperties.length,
    }));
    const beforePreserveHeal = JSON.stringify(prevProperties);
    prevProperties = applyDurablePropertyHeals(prevProperties, city.id, globalStreetDisplay);
    const preserveHealed = JSON.stringify(prevProperties) !== beforePreserveHeal;

    const aged = archivePastActive(prevProperties, todayWarsaw());
    if (aged === 0 && !preserveHealed) {
      console.error('  nothing to age out; updating source-attempt state only.');
      const lastSuccess = prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null;
      const meta = {
        ...(prevMeta || { schema_version: SCHEMA_VERSION, parser_version: PARSER_VERSION }),
        city: city.id,
        last_source_attempt_at: attemptedAt,
        last_successful_source_check_at: lastSuccess,
        monitored_assets: prevMeta?.monitored_assets || observedAssetClasses(prevProperties, prevMeta?.land_plots || 0),
        source_checks: {
          property: { status: 'degraded', last_attempt_at: attemptedAt, last_success_at: prevMeta?.source_checks?.property?.last_success_at || lastSuccess },
          land: (prevMeta?.land_plots || 0) > 0
            ? { status: 'degraded', last_attempt_at: attemptedAt, last_success_at: prevMeta?.source_checks?.land?.last_success_at || lastSuccess }
            : { status: 'not_monitored', last_attempt_at: attemptedAt, last_success_at: null },
        },
        stale: true,
      };
      const cityDir = join(DATA_DIR, city.id);
      await mkdir(cityDir, { recursive: true });
      await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
      return meta;
    }
    if (aged) {
      console.error(`  aged out ${aged} past-dated preserved listings (active → archived); rewriting data files.`);
    } else {
      console.error('  durable property heals changed preserved data; rewriting data files.');
    }

    let activeAuctions = 0;
    let archivedAuctions = 0;
    for (const p of prevProperties) {
      for (const l of p.listings || []) {
        if (l.outcome === 'active') activeAuctions++;
        else if (l.outcome === 'archived' || l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'no_winner') archivedAuctions++;
      }
    }
    const cityDir = join(DATA_DIR, city.id);
    await mkdir(cityDir, { recursive: true });
    await writeFile(
      join(cityDir, 'properties.json'),
      JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, properties: prevProperties }, null, 2) + '\n',
    );
    try {
      const activePath = join(cityDir, 'active.json');
      const prevActive = JSON.parse(await readFile(activePath, 'utf8'));
      const today = todayWarsaw();
      const keep = (prevActive.listings || []).filter((l) => !l.auction_date || l.auction_date >= today);
      for (const l of keep) if (l.kind != null) l.kind = normalizeKind(l.kind);
      syncActiveListingRounds(keep, prevProperties, { inferUnmarked: city.id === 'gliwice' });
      if (JSON.stringify(keep) !== JSON.stringify(prevActive.listings || [])) {
        await writeFile(activePath, JSON.stringify({ ...prevActive, listings: keep }, null, 2) + '\n');
      }
    } catch {}
    const meta = {
      ...(prevMeta || { schema_version: SCHEMA_VERSION, parser_version: PARSER_VERSION }),
      city: city.id,
      generated_at: new Date().toISOString(),
      unique_properties: prevProperties.length,
      active_auctions: activeAuctions,
      archived_auctions: archivedAuctions,
      stale: true,
      last_source_attempt_at: attemptedAt,
      last_successful_source_check_at: prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null,
      monitored_assets: prevMeta?.monitored_assets || observedAssetClasses(prevProperties, prevMeta?.land_plots || 0),
      source_checks: {
        property: {
          status: 'degraded', last_attempt_at: attemptedAt,
          last_success_at: prevMeta?.source_checks?.property?.last_success_at || prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null,
        },
        land: (prevMeta?.land_plots || 0) > 0
          ? {
            status: 'degraded', last_attempt_at: attemptedAt,
            last_success_at: prevMeta?.source_checks?.land?.last_success_at || prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null,
          }
          : { status: 'not_monitored', last_attempt_at: attemptedAt, last_success_at: null },
      },
    };
    await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
    console.error('--- summary (preserved + aged) ---');
    console.error(JSON.stringify(meta, null, 2));
    return meta;
  }

  let retained = { kept_properties: 0, kept_listings: 0 };
  if (MERGE_HISTORY && prevProperties.length > 0) {
    healKinds(prevProperties);
    try {
      const merged = mergeProperties(prevProperties, properties);
      properties = merged.properties;
      retained = merged.stats;
      console.error(
        `History merge: ${properties.length} total (retained ${retained.kept_properties} properties + ${retained.kept_listings} listings absent from this crawl).`,
      );
    } catch (err) {
      console.error(`  WARN: history merge skipped (${err.message}); writing fresh build.`);
    }
    const beforeHeal = properties.length;
    properties = applyDurablePropertyHeals(properties, city.id, globalStreetDisplay);
    if (properties.length !== beforeHeal) {
      console.error(`  healed ${beforeHeal - properties.length} duplicate/alias propert${beforeHeal - properties.length === 1 ? 'y' : 'ies'} post-merge.`);
    }
  } else {
    properties = applyDurablePropertyHeals(properties, city.id, globalStreetDisplay);
  }

  const verifiedEmptyArchived = verifiedEmpty ? archiveAllActive(properties) : 0;
  if (verifiedEmptyArchived) {
    console.error(
      `  archived ${verifiedEmptyArchived} retained active listing(s) because the authoritative source verified an empty in-scope board.`,
    );
  }
  const agedOut = archivePastActive(properties, todayWarsaw());
  if (agedOut) console.error(`  aged out ${agedOut} past-dated retained listings (active → archived).`);

  syncActiveListingRounds(active, properties);

  let activeAuctions = 0;
  let archivedAuctions = 0;
  for (const p of properties) {
    for (const l of p.listings) {
      if (l.outcome === 'active') activeAuctions++;
      else if (l.outcome === 'archived' || l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'no_winner') archivedAuctions++;
    }
  }

  const landBuilt = buildLand(landRecords, city.id, city);

  const landFile = join(DATA_DIR, city.id, 'land.json');
  let prevPlots = [];
  if (existsSync(landFile)) {
    try { prevPlots = JSON.parse(await readFile(landFile, 'utf8'))?.plots || []; } catch { prevPlots = []; }
  }
  prevPlots = repairLandLedger(prevPlots, city.id);
  const { plots: landPlots, preserveFile: landPreserved } = reconcileLandHistory(
    prevPlots, repairLandLedger(landBuilt.plots, city.id), {
      mergeHistory: MERGE_HISTORY, complete: landComplete,
      verifiedEmpty: valid_empty_land === true, today: todayWarsaw(),
    },
  );
  if (prevPlots.length > 0) {
    console.error(`  ${city.id}: land history reconciled ${prevPlots.length} previous + ${landBuilt.plots.length} current plot(s) into ${landPlots.length} retained plot(s).`);
  }

  const meta = {
    schema_version: SCHEMA_VERSION,
    parser_version: PARSER_VERSION,
    city: city.id,
    generated_at: new Date().toISOString(),
    source_pdf_count: docRefs.length,
    parsed_records: allRecords.length,
    parser_note_count: parsedNoteCount,
    unique_properties: properties.length,
    active_listings: active.length,
    active_auctions: activeAuctions,
    archived_auctions: archivedAuctions,
    wykaz_entries: wykaz.length,
    land_plots: landPlots.length,
    land_listings: landRecords.length,
    retained_properties: retained.kept_properties,
    valid_empty: verifiedEmpty,
    valid_empty_land: landRecords.length === 0 && valid_empty_land === true,
    last_source_attempt_at: attemptedAt,
    last_successful_source_check_at: attemptedAt,
    monitored_assets: observedAssetClasses(properties, landPlots.length),
    source_checks: {
      ...(docRefs.complete === undefined ? {} : { results: {
        status: docRefs.complete ? 'healthy' : 'degraded', complete: docRefs.complete,
        last_attempt_at: attemptedAt,
        last_success_at: docRefs.complete ? attemptedAt : prevMeta?.source_checks?.results?.last_success_at || null,
      } }),
      property: propertyCrawlEmpty
        ? (verifiedEmpty
          ? { status: 'verified_empty', last_attempt_at: attemptedAt, last_success_at: attemptedAt }
          : (prevProperties.length > 0
            ? {
              status: 'degraded', last_attempt_at: attemptedAt,
              last_success_at: prevMeta?.source_checks?.property?.last_success_at || prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null,
            }
            : { status: 'not_monitored', last_attempt_at: attemptedAt, last_success_at: null }))
        : { status: 'healthy', last_attempt_at: attemptedAt, last_success_at: attemptedAt },
      land: landRecords.length > 0
        ? { status: 'healthy', complete: landComplete, last_attempt_at: attemptedAt, last_success_at: attemptedAt }
        : (valid_empty_land === true
          ? { status: 'verified_empty', complete: landComplete, last_attempt_at: attemptedAt, last_success_at: attemptedAt }
          : (prevPlots.length > 0
            ? {
              status: 'degraded', complete: landComplete, last_attempt_at: attemptedAt,
              last_success_at: prevMeta?.source_checks?.land?.last_success_at || prevMeta?.last_successful_source_check_at || prevMeta?.generated_at || null,
            }
            : { status: 'not_monitored', complete: landComplete, last_attempt_at: attemptedAt, last_success_at: null })),
    },
    ...(!landComplete ? { land_complete: false } : {}),
  };

  const cityDir = join(DATA_DIR, city.id);
  await mkdir(cityDir, { recursive: true });
  await writeFile(
    join(cityDir, 'properties.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, properties }, null, 2) + '\n',
  );
  await writeFile(
    join(cityDir, 'active.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, listings: active, wykaz }, null, 2) + '\n',
  );
  await writeFile(
    join(cityDir, 'meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
  if (!landPreserved) {
    await writeFile(
      join(cityDir, 'land.json'),
      JSON.stringify({ schema_version: LAND_SCHEMA_VERSION, city: city.id, plots: landPlots }, null, 2) + '\n',
    );
  }

  console.error('--- summary ---');
  console.error(JSON.stringify(meta, null, 2));
  const activeWithHistory = properties.filter(
    (p) =>
      p.listings.some((l) => l.outcome === 'active') &&
      p.listings.some((l) => l.outcome === 'unsold' || l.outcome === 'sold'),
  );
  console.error(`Currently active properties with prior history: ${activeWithHistory.length}`);
  return meta;
}

const CITY_FILTER = (process.env.CITY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const globalStreetDisplay = buildGlobalStreetDisplay(DATA_DIR);

  let selected = cities;
  if (CITY_FILTER.length) {
    const unknown = CITY_FILTER.filter((id) => !cities.some((c) => c.id === id));
    if (unknown.length) {
      throw new Error(
        `unknown city id(s) in CITY env: ${unknown.join(', ')} ` +
        `(registry: ${cities.map((c) => c.id).join(', ')})`,
      );
    }
    selected = cities.filter((c) => CITY_FILTER.includes(c.id));
    console.error(`CITY filter: running only [${CITY_FILTER.join(', ')}]; index.json skipped.`);
  }

  const metas = [];
  for (const city of selected) {
    try {
      metas.push(await refreshCity(city, globalStreetDisplay));
    } catch (err) {
      console.error(`\n!!! ${city.id}: refresh FAILED (${err?.message || err}) — keeping last-published data, continuing with other cities.`);
      console.error('TRIAGE ' + JSON.stringify({
        city: city.id, kind: 'throw', message: String(err?.message || err),
      }));
      try {
        const prevMeta = JSON.parse(await readFile(join(DATA_DIR, city.id, 'meta.json'), 'utf8'));
        metas.push({ ...prevMeta, city: city.id, stale: true });
      } catch {
        console.error(`    (no previously-published data for ${city.id}; emitting a zero-count placeholder so it still appears in index.json)`);
        metas.push({
          schema_version: SCHEMA_VERSION,
          city: city.id,
          unique_properties: 0,
          active_listings: 0,
          active_auctions: 0,
          archived_auctions: 0,
          wykaz_entries: 0,
          land_plots: 0,
          stale: true,
        });
      }
    }
  }

  if (CITY_FILTER.length) {
    console.error('\n=== selected cities done (index.json left to build-index.js) ===');
  } else {
    const index = {
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      cities: cities.map((c) => {
        const m = metas.find((x) => x.city === c.id);
        const validation = validationPolicy(c.id);
        const sourceDegraded = Object.values(m?.source_checks || {}).some((source) => source?.status === 'degraded');
        return {
          id: c.id,
          label: c.label,
          voivodeship: c.voivodeship,
          authority: c.authority,
          host: c.host,
          unique_properties: m?.unique_properties ?? 0,
          active_listings: m?.active_listings ?? 0,
          active_auctions: m?.active_auctions ?? 0,
          archived_auctions: m?.archived_auctions ?? 0,
          wykaz_entries: m?.wykaz_entries ?? 0,
          land_plots: m?.land_plots ?? 0,
          validation_status: validation.status,
          validation_reason: validation.reason,
          validation_review_due: validation.review_due,
          coverage_status: validation.status === 'quarantined' || sourceDegraded || m?.stale === true
            ? 'degraded' : (m?.valid_empty ? 'valid_empty' : ((m?.monitored_assets || []).length ? 'monitored' : 'unknown')),
          monitored_assets: m?.monitored_assets || [],
          last_source_attempt_at: m?.last_source_attempt_at || null,
          last_successful_source_check_at: m?.last_successful_source_check_at || m?.generated_at || null,
          last_refresh_status: m?.stale === true ? 'failed' : 'ready',
          last_refresh_duration_ms: null,
          last_refresh_request_count: null,
        };
      }),
    };
    await writeFile(
      join(DATA_DIR, 'index.json'),
      JSON.stringify(index, null, 2) + '\n',
    );

    console.error('\n=== all cities done ===');
    console.error(JSON.stringify(index, null, 2));
  }

  await closeBrowser();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await closeBrowser().catch(() => {});
  process.exit(1);
});
