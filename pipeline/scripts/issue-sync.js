import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const LABEL_BROKEN = 'city-broken';
const LABEL_HEALTH = 'health-check';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const MIN_UNIQUE = Number(process.env.MIN_UNIQUE || 1);

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
      return args[1] === 'list' ? '[]' : '';
    }
    return execFileSync('gh', args, { encoding: 'utf8', timeout: 60_000 });
  };
}

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

function stableTitle(title) {
  return title
    .replace(/data stale \([\d.]+ days old > (\d+)d\)/g, 'data stale (> $1d)')
    .replace(/\([\d.]+d > (\d+)d\)/g, '(> $1d)')
    .replace(/latest refresh attempt failed at (?:\d{4}-\d{2}-\d{2}T[^;]+|an unknown time);/g,
      'latest refresh attempt failed;');
}

export function syncIssues(failures, recovered, { source, runUrl, run, uniqueForCity }) {
  const ops = [];

  const open = JSON.parse(run(['issue', 'list', '--state', 'open',
    '--label', LABEL_BROKEN, '--json', 'number,title,labels', '--limit', '10000']));
  if (!Array.isArray(open) || open.length >= 10000) throw new Error('Incomplete open-issue inventory');
  const byCity = new Map();
  for (const issue of open) {
    for (const label of issue.labels || []) {
      if (label.name.startsWith('city:') && !byCity.has(label.name.slice(5))) {
        byCity.set(label.name.slice(5), issue);
      }
    }
  }
  const findOpen = (city) => byCity.get(city);

  if (failures.size) {
    run(['label', 'create', LABEL_BROKEN, '--color', 'd73a4a', '--force',
      '--description', 'A city adapter is broken (auto-managed by triage)']);
    if (source === 'health') {
      run(['label', 'create', LABEL_HEALTH, '--color', 'fbca04', '--force',
        '--description', 'Opened by the daily data health check']);
    }
  }

  for (const [city, { failure, bodyPath }] of failures) {
    const title = stableTitle(`[city-broken] ${city}: ${failure.headline}`);
    const existing = findOpen(city);
    if (!existing) {
      run(['label', 'create', `city:${city}`, '--color', 'ededed', '--force']);
      const labels = [LABEL_BROKEN, `city:${city}`, ...(source === 'health' ? [LABEL_HEALTH] : [])];
      run(['issue', 'create', '--title', title, '--body-file', bodyPath,
        ...labels.flatMap((l) => ['--label', l])]);
      ops.push({ op: 'create', city, title });
    } else {
      const isHealthOwned = (existing.labels || []).some((l) => l.name === LABEL_HEALTH);
      const ownsTitle = source === 'health' ? isHealthOwned : !isHealthOwned;
      if (!ownsTitle || existing.title === title) {
        ops.push({ op: 'unchanged', city, number: existing.number,
          ...(!ownsTitle ? { reason: 'incident owned by the other monitor' } : {}) });
        continue;
      }
      run(['issue', 'edit', String(existing.number), '--title', title, '--body-file', bodyPath]);
      ops.push({ op: 'edit', city, number: existing.number });
    }
  }

  for (const city of new Set(recovered)) {
    if (failures.has(city)) continue;
    const existing = findOpen(city);
    if (!existing) continue;
    const isHealthOwned = (existing.labels || []).some((l) => l.name === LABEL_HEALTH);
    if (source === 'health' && !isHealthOwned) {
      ops.push({ op: 'skip-close', city, number: existing.number, reason: 'refresh-owned issue' });
      continue;
    }
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

  if (process.env.ENABLE_ISSUE_SYNC !== 'true' && a['force-sync'] !== 'true' && !dryRun) {
    console.error('issue-sync: automated issue creation/sync disabled to prevent notification email flood. Set ENABLE_ISSUE_SYNC=true or pass --force-sync to run.');
    return;
  }

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
    `${ops.filter((o) => o.op === 'edit').length} updated, ` +
    `${ops.filter((o) => o.op === 'unchanged').length} unchanged, ` +
    `${ops.filter((o) => o.op === 'close').length} closed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`issue-sync: ERROR ${err?.message || err}`);
  });
}
