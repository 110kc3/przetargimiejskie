import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateLandDocument } from './coverage-health.js';
import { validationPolicy } from './validation-policy.js';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));
const STALE_DAYS = Number(process.env.STALE_DAYS || 14);
const MIN_UNIQUE = Number(process.env.MIN_UNIQUE || 1);
const EXEMPT_MAX_DAYS = Number(process.env.EXEMPT_MAX_DAYS || 21);

const EXEMPT_EMPTY = new Set();

const LEGIT_EMPTY_RECHECK_DAYS = Number(process.env.LEGIT_EMPTY_RECHECK_DAYS || 45);

const LEGIT_EMPTY = new Map([
  ['chrzanow', { since: '2026-08-23', reason: 'live-rechecked: renderer and harvest work; current articles are land/lease/non-residential' }],
  ['strzelce-krajenskie', { since: '2026-08-23', reason: 'live-rechecked: current board has one land item and only non-flat result refs' }],
  ['zdunska-wola', { since: '2026-08-23', reason: 'live-rechecked: current auction XML is empty; source and adapter are reachable' }],
  ['gostyn', { since: '2026-08-23', reason: 'live-rechecked: current result material is land-only; no residential-flat auction' }],
  ['lipsko', { since: '2026-08-23', reason: 'live-rechecked: current candidates and results are land; no open-auction flat' }],
  ['poznan', { since: '2026-08-23', reason: 'live-rechecked: current WGN/results boards have land only and no flat result' }],
  ['lubin', { since: '2026-08-23', reason: 'live-rechecked: announcement/result boards are empty between sessions; sibling board works' }],
]);

const EXEMPT_NEW = new Map();

const EGRESS_STALE_MAX_DAYS = Number(process.env.EGRESS_STALE_MAX_DAYS || 21);
const EGRESS_STALE = new Map([
  ['raciborz', { since: '2026-09-05', reason: 'last-good data retained; the shared FINN origin drops Azure connections' }],
  ['pszczyna', { since: '2026-09-05', reason: 'last-good data retained; its source returns 503 from hosted runners' }],
]);

const now = Date.now();
const fails = [];
const warns = [];

function daysSince(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / 86_400_000;
}

function fail(city, classification, message, meta = null) {
  fails.push({ city, classification, message, meta });
}

function exemption(cityId) {
  const e = EXEMPT_NEW.get(cityId);
  if (!e) return { active: false, expired: false };
  const age = daysSince(e.since);
  return { active: age <= EXEMPT_MAX_DAYS, expired: age > EXEMPT_MAX_DAYS, age, ...e };
}

function egressStaleExemption(cityId) {
  const e = EGRESS_STALE.get(cityId);
  if (!e) return { active: false, expired: false };
  const age = daysSince(e.since);
  return {
    active: age <= EGRESS_STALE_MAX_DAYS,
    expired: age > EGRESS_STALE_MAX_DAYS,
    age,
    ...e,
  };
}

const indexPath = join(DATA_DIR, 'index.json');
if (!existsSync(indexPath)) {
  console.error('FAIL: data/index.json missing — has the pipeline ever run?');
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));

for (const c of index.cities || []) {
  const ex = exemption(c.id);
  const egressEx = egressStaleExemption(c.id);
  const validation = validationPolicy(c.id);
  if (validation.status === 'quarantined' && daysSince(validation.review_due) > 0) {
    fail(c.id, 'validation-quarantine-expired',
      `validation quarantine review was due ${validation.review_due}; repair or explicitly renew it`);
  }
  if (ex.expired) {
    fail(c.id, 'exempt-expired',
      `in EXEMPT_NEW since ${ex.since} (${ex.age.toFixed(0)}d > ${EXEMPT_MAX_DAYS}d) — ` +
      `remove the entry or fix the adapter (reason was: ${ex.reason})`);
  } else if (ex.active && ex.age > EXEMPT_MAX_DAYS * 0.75) {
    warns.push(`${c.id}: EXEMPT_NEW entry expiring (${ex.age.toFixed(0)}d of ${EXEMPT_MAX_DAYS}d) — ${ex.reason}`);
  }

  const metaPath = join(DATA_DIR, c.id, 'meta.json');
  if (!existsSync(metaPath)) {
    if (ex.active) warns.push(`${c.id}: meta.json missing (new adapter, pending first live refresh)`);
    else fail(c.id, 'meta-missing', 'meta.json missing');
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fail(c.id, 'meta-missing', `meta.json unparseable (${e.message})`);
    continue;
  }

  const unique = meta.unique_properties ?? c.unique_properties ?? 0;
  const activeAuctions = meta.active_auctions ?? c.active_auctions ?? 0;
  const activeListings = meta.active_listings ?? c.active_listings ?? 0;
  const landPlots = meta.land_plots ?? c.land_plots ?? 0;
  const age = daysSince(meta.last_successful_source_check_at || meta.generated_at);

  if (unique < MIN_UNIQUE && landPlots === 0) {
    const le = LEGIT_EMPTY.get(c.id);
    const leAge = le ? daysSince(le.since) : Infinity;
    if (meta.valid_empty === true) {
      warns.push(`${c.id}: source reached and explicitly verified empty`);
    } else if (ex.active) {
      warns.push(`${c.id}: unique_properties=${unique} (< ${MIN_UNIQUE}) — new adapter, pending first live refresh`);
    } else if (le && leAge <= LEGIT_EMPTY_RECHECK_DAYS) {
      const soon = leAge > LEGIT_EMPTY_RECHECK_DAYS * 0.8 ? ` — recheck due in ${(LEGIT_EMPTY_RECHECK_DAYS - leAge).toFixed(0)}d` : '';
      warns.push(`${c.id}: unique_properties=${unique} — source legitimately empty (${le.reason})${soon}`);
    } else if (le) {
      fail(c.id, 'legit-empty-recheck',
        `LEGIT_EMPTY since ${le.since} (${leAge.toFixed(0)}d > ${LEGIT_EMPTY_RECHECK_DAYS}d) — reconfirm the ` +
        `source is still empty-by-design (${le.reason}) and bump its \`since\`, or remove it if it now has data`, meta);
    } else {
      fail(c.id, 'empty-data', `unique_properties=${unique} (< ${MIN_UNIQUE}) — adapter likely broke`, meta);
    }
  }
  if (landPlots > 0) {
    const reportLandFailure = (message) => {
      if (validation.status === 'quarantined') {
        warns.push(`${c.id}: validation quarantine — ${message}`);
      } else {
        fail(c.id, 'land-data', message, meta);
      }
    };
    const landPath = join(DATA_DIR, c.id, 'land.json');
    if (!existsSync(landPath)) {
      reportLandFailure(`land_plots=${landPlots} but land.json is missing`);
    } else {
      try {
        const land = JSON.parse(readFileSync(landPath, 'utf8'));
        for (const message of validateLandDocument(c.id, land)) reportLandFailure(message);
        if ((land.plots || []).length !== landPlots) {
          reportLandFailure(`land_plots=${landPlots} does not match land.json (${(land.plots || []).length})`);
        }
      } catch (error) {
        reportLandFailure(`land.json unparseable (${error.message})`);
      }
    }
  }
  const degradedStreams = Object.entries(meta.source_checks || {})
    .filter(([, source]) => source?.status === 'degraded')
    .map(([stream]) => stream);
  if (degradedStreams.length) {
    fail(c.id, 'source-degraded', `${degradedStreams.join(', ')} source stream(s) degraded; last-good data is being preserved`, meta);
  }
  if (c.last_refresh_status === 'failed' && degradedStreams.length === 0) {
    fail(c.id, 'refresh-failed',
      `latest refresh attempt failed at ${c.last_source_attempt_at || 'an unknown time'}; last-good data is being preserved`, meta);
  }
  if (age > STALE_DAYS) {
    const ageStr = age === Infinity ? 'no/invalid generated_at' : `${age.toFixed(1)} days old`;
    if (egressEx.active) {
      const remaining = Math.max(0, EGRESS_STALE_MAX_DAYS - egressEx.age).toFixed(0);
      warns.push(
        `${c.id}: data stale (${ageStr} > ${STALE_DAYS}d), temporarily excluded for known egress failure ` +
        `(${egressEx.reason}); exemption expires in ${remaining}d`,
      );
    } else if (egressEx.expired) {
      fail(c.id, 'exempt-expired',
        `egress staleness exemption from ${egressEx.since} expired ` +
        `(${egressEx.age.toFixed(0)}d > ${EGRESS_STALE_MAX_DAYS}d) — restore direct hosted reachability or keep this as an explicit failing gap ` +
        `(reason was: ${egressEx.reason})`, meta);
    } else {
      fail(c.id, 'stale-data', `data stale (${ageStr} > ${STALE_DAYS}d) — crawl stopped updating`, meta);
    }
  }
  if (meta.stale === true && !ex.active) {
    warns.push(`${c.id}: serving PRESERVED last-good data (meta.stale) — crawl is failing; check the refresh log / open triage issue`);
  }
  if (!EXEMPT_EMPTY.has(c.id)) {
    if (activeAuctions === 0) warns.push(`${c.id}: 0 active auctions on the board`);
    if (activeListings === 0) warns.push(`${c.id}: 0 active listings`);
  }

  const status = fails.some((f) => f.city === c.id) ? 'FAIL' : 'ok';
  console.error(
    `${status === 'ok' ? '  ok ' : 'FAIL '}${c.id.padEnd(16)} ` +
    `unique:${String(unique).padStart(4)}  active:${String(activeAuctions).padStart(3)}  ` +
    `age:${age === Infinity ? '  ?' : age.toFixed(0).padStart(3)}d`,
  );
}

if (warns.length) {
  console.error('\nWARN (not failing the run):');
  for (const w of warns) console.error(`  • ${w}`);
}

if (process.env.HEALTH_JSON_OUT) {
  writeFileSync(process.env.HEALTH_JSON_OUT, JSON.stringify(fails, null, 2) + '\n');
}

if (fails.length) {
  console.error(`\nHEALTH CHECK FAILED — ${fails.length} issue(s):`);
  for (const f of fails) console.error(`  ✗ ${f.city}: ${f.message}`);
  process.exit(1);
}

console.error(`\nHealth OK — ${(index.cities || []).length} cities, all within the configured health policy.`);
