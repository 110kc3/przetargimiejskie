// GitHub-issue lifecycle for city failures — exactly ONE open issue per broken
// city, updated (not duplicated) on repeat failures, auto-closed on recovery.
// Runs in CI with GH_TOKEN=${{ github.token }}; all GitHub access goes through
// the preinstalled `gh` CLI, so there are no dependencies and no API keys.
//
//   node scripts/issue-sync.js --failures-dir <dir> --recovered <ids|csv> \
//     --run-url U --source refresh|health [--health-json F] [--dry-run]
//
// --failures-dir: a directory of <anything>/failure.json + issue-body.md pairs
//   (the downloaded triage-* artifacts, or dirs produced by --health-json).
// --recovered: comma-separated city ids that are HEALTHY this run (the sync
//   subtracts the failed ones itself). Only these cities' issues can be closed,
//   so a single-city dispatch can never mass-close other cities' issues.
// --health-json: health-check.js failure list ([{city, classification,
//   message}]); entries are rendered into failure dirs via triage-report.js
//   before syncing. Implies nothing about closing — see the scope rule.
//
// SCOPE RULE (anti-flap): the refresh-side sync may close any `city-broken`
// issue — a green refresh genuinely resolves staleness too — EXCEPT a
// `health-check`-owned issue for a city that still has 0 tracked properties: a
// crawl can "succeed" empty (preserve-on-empty, or a first-run adapter that
// parses nothing), so refresh sees no drop and calls the city healthy, but the
// daily health check FAILs it on unique_properties=0 and reopens the issue —
// closing it here just starts an open/close flap (observed on busko-zdroj #7).
// The health-side sync only closes issues it created (labelled `health-check`):
// the 07:00 health run sees preserved last-good data as "healthy" and must NOT
// close a layout-change issue the 04:30 refresh triage just opened. TITLE
// OWNERSHIP: only the owning source re-titles an issue (health owns its
// health-check-labelled issues, refresh owns the rest) so a city failing BOTH
// sources doesn't ping-pong its title every run.
//
// Testable: pass a custom runner to syncIssues(); the CLI uses execFileSync.
// --dry-run prints every gh command instead of executing.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const LABEL_BROKEN = 'city-broken';
const LABEL_HEALTH = 'health-check';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// Match health-check.js's empty-data threshold so the anti-flap guard's "city
// still empty" test tracks exactly what health FAILs on. Nothing overrides
// MIN_UNIQUE today (both default 1), but keeping them coupled means the guard
// can't drift out of sync with health's fail condition if it ever is.
const MIN_UNIQUE = Number(process.env.MIN_UNIQUE || 1);

/**
 * unique_properties from a city's committed meta.json, or null if it can't be
 * read. Lets the refresh-side close respect a city that is technically "green"
 * (crawl didn't throw) but still has no tracked data — see the anti-flap rule.
 */
function uniqueForCityFs(city) {
  try {
    const meta = JSON.parse(readFileSync(join(DATA_DIR, city, 'meta.json'), 'utf8'));
    return meta.unique_properties ?? null;
  } catch { return null; }
}

function realRunner(dryRun) {
  return (args) => {
    if (dryRun) {
      console.error(`DRY-RUN gh ${args.join(' ')}`);
      // Pretend "no open issues" for list calls so create paths are visible.
      return args[1] === 'list' ? '[]' : '';
    }
    return execFileSync('gh', args, { encoding: 'utf8' });
  };
}

/** Load {city → {failure, bodyPath}} from a dir of triage artifact dirs. */
export function loadFailures(dir) {
  const out = new Map();
  if (!dir || !existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const sub = join(dir, entry);
    if (!statSync(sub).isDirectory()) continue;
    const fPath = join(sub, 'failure.json');
    const bPath = join(sub, 'issue-body.md');
    if (!existsSync(fPath) || !existsSync(bPath)) continue;
    try {
      const failure = JSON.parse(readFileSync(fPath, 'utf8'));
      if (failure?.city) out.set(failure.city, { failure, bodyPath: bPath });
    } catch (e) {
      console.error(`issue-sync: skipping unreadable ${fPath} (${e.message})`);
    }
  }
  return out;
}

function renderStillFailingComment(failure, runUrl) {
  const ev = (failure.evidence || [])[0];
  return `Still failing — [run](${runUrl}) (classification: **${failure.classification}**).` +
    (ev ? `\n\n> ${ev}` : '');
}

/**
 * Reconcile open issues with this run's failures/recoveries.
 * @param {Map<string,{failure:object,bodyPath:string}>} failures
 * @param {string[]} recovered  healthy-this-run city ids (failed ones removed here)
 * @param {{source:'refresh'|'health', runUrl:string, run:(args:string[])=>string,
 *          uniqueForCity?:(city:string)=>(number|null)}} opts
 *   uniqueForCity — committed unique_properties lookup; when provided, a refresh
 *   run won't close a health-owned issue for a city still at 0 (anti-flap).
 */
export function syncIssues(failures, recovered, { source, runUrl, run, uniqueForCity }) {
  const ops = []; // recorded for tests + the summary line

  const findOpen = (city) => {
    const json = run(['issue', 'list', '--state', 'open',
      '--label', LABEL_BROKEN, '--label', `city:${city}`,
      '--json', 'number,title,labels', '--limit', '5']);
    try { return JSON.parse(json || '[]')[0] || null; } catch { return null; }
  };

  // Labels are idempotent to create; per-city labels only when needed.
  if (failures.size) {
    run(['label', 'create', LABEL_BROKEN, '--color', 'd73a4a', '--force',
      '--description', 'A city adapter is broken (auto-managed by triage)']);
    if (source === 'health') {
      run(['label', 'create', LABEL_HEALTH, '--color', 'fbca04', '--force',
        '--description', 'Opened by the daily data health check']);
    }
  }

  for (const [city, { failure, bodyPath }] of failures) {
    const title = `[city-broken] ${city}: ${failure.headline}`;
    const existing = findOpen(city);
    if (!existing) {
      run(['label', 'create', `city:${city}`, '--color', 'ededed', '--force']);
      const labels = [LABEL_BROKEN, `city:${city}`, ...(source === 'health' ? [LABEL_HEALTH] : [])];
      run(['issue', 'create', '--title', title, '--body-file', bodyPath,
        ...labels.flatMap((l) => ['--label', l])]);
      ops.push({ op: 'create', city, title });
    } else {
      run(['issue', 'comment', String(existing.number), '--body',
        renderStillFailingComment(failure, runUrl)]);
      ops.push({ op: 'comment', city, number: existing.number });
      // Re-title/body only when the failure mode changed AND this source owns
      // the title. Ownership follows the label: health owns the issues it
      // opened (health-check label), refresh owns the rest. Without this, a
      // city failing BOTH sources ping-pongs its title every run (refresh
      // headline → health headline → refresh headline …) — pure churn.
      const isHealthOwned = (existing.labels || []).some((l) => l.name === LABEL_HEALTH);
      const ownsTitle = source === 'health' ? isHealthOwned : !isHealthOwned;
      if (existing.title !== title && ownsTitle) {
        run(['issue', 'edit', String(existing.number), '--title', title, '--body-file', bodyPath]);
        ops.push({ op: 'edit', city, number: existing.number });
      }
    }
  }

  for (const city of recovered) {
    if (failures.has(city)) continue; // failed this run — obviously not recovered
    const existing = findOpen(city);
    if (!existing) continue;
    const isHealthOwned = (existing.labels || []).some((l) => l.name === LABEL_HEALTH);
    // Scope rule: health may only close issues it opened (health-check label).
    if (source === 'health' && !isHealthOwned) {
      ops.push({ op: 'skip-close', city, number: existing.number, reason: 'refresh-owned issue' });
      continue;
    }
    // Anti-flap: a green REFRESH must NOT close a HEALTH-owned issue while the
    // city still has 0 tracked properties. The crawl "succeeded" but produced
    // no data, so classify reports the city healthy — yet the daily health
    // check FAILs it on unique_properties=0 and reopens the issue next morning.
    // Closing it here just starts a daily flap (busko-zdroj #7). Only health's
    // own green run (unique ≥ 1) may close it.
    if (source === 'refresh' && isHealthOwned && uniqueForCity && !(uniqueForCity(city) >= MIN_UNIQUE)) {
      ops.push({ op: 'skip-close', city, number: existing.number,
        reason: 'health-owned issue; city still has 0 tracked properties' });
      continue;
    }
    run(['issue', 'close', String(existing.number), '--comment',
      `Recovered in [this run](${runUrl}): ${source === 'health' ? 'health check green' : 'refresh green, data committed'}.`]);
    ops.push({ op: 'close', city, number: existing.number });
  }

  return ops;
}

// ---- CLI -------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? next : 'true';
  }
  return args;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const source = a.source === 'health' ? 'health' : 'refresh';
  const runUrl = a['run-url'] || '';
  const dryRun = a['dry-run'] === 'true';
  const failuresDir = a['failures-dir'] || '';

  // Health path: materialize failure dirs from health-check.js's JSON first,
  // reusing triage-report.js's renderer so both sources share one template.
  if (a['health-json'] && existsSync(a['health-json'])) {
    const { renderIssueBody } = await import('./triage-report.js');
    const entries = JSON.parse(readFileSync(a['health-json'], 'utf8'));
    for (const e of entries) {
      const failure = {
        schema: 1, city: e.city, classification: e.classification,
        headline: e.message, phase: 'health', run_url: runUrl, run_id: null,
        detected_at: new Date().toISOString(), prev_meta: e.meta || null,
        evidence: [], log_tail: '', artifact_name: `triage-${e.city}`,
      };
      const dir = join(failuresDir, `health-${e.city}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'failure.json'), JSON.stringify(failure, null, 2) + '\n');
      writeFileSync(join(dir, 'issue-body.md'), renderIssueBody(failure));
    }
  }

  const failures = loadFailures(failuresDir);
  const recoveredRaw = a.recovered || '';
  const recovered = (existsSync(recoveredRaw) && statSync(recoveredRaw).isFile()
    ? readFileSync(recoveredRaw, 'utf8') : recoveredRaw)
    .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

  const ops = syncIssues(failures, recovered,
    { source, runUrl, run: realRunner(dryRun), uniqueForCity: uniqueForCityFs });
  console.error(`issue-sync (${source}${dryRun ? ', dry-run' : ''}): ` +
    `${failures.size} failing, ${ops.filter((o) => o.op === 'create').length} created, ` +
    `${ops.filter((o) => o.op === 'comment').length} commented, ` +
    `${ops.filter((o) => o.op === 'close').length} closed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    // Failing the triage job would mask the real signal (the city issues) —
    // log loudly and exit 0; the workflow summary still shows the error.
    console.error(`issue-sync: ERROR ${err?.message || err}`);
  });
}
