// Per-city failure triage — classifies WHY a city's refresh broke and renders
// the GitHub issue body (including a paste-into-Claude-Code fix prompt).
//
// Motivation: a broken city's matrix job is usually GREEN — refresh.js catches
// per-city throws and the preserve-on-empty path exits 0 (by design, so one
// city can't block the others). Job conclusion alone therefore says nothing;
// this script inspects the teed refresh/sanity logs, the machine-readable
// `TRIAGE {...}` lines refresh.js emits, and the pre-run vs post-run meta.json
// to decide whether the city is broken and how.
//
// CLI (all subcommands exit 0 ALWAYS — triage must never change a job's
// status or block a data commit):
//   node scripts/triage-report.js classify --city X \
//     --refresh-outcome success|failure|cancelled|skipped --sanity-outcome ... \
//     --refresh-log F --sanity-log F --prev-meta F [--new-meta F] \
//     --run-url U --out-dir D
//       → writes D/failure.json + D/issue-body.md ONLY when broken.
//   node scripts/triage-report.js synthesize --city X --classification timeout \
//     --run-url U --out-dir D
//       → failure entry for a hard-killed job that never ran classify.
//   node scripts/triage-report.js render --failure F.json --out body.md
//       → issue body from an existing failure.json (health-check path).
//
// Exports (classifyCity / renderTitle / renderIssueBody) are pure and
// unit-tested in tests/triage-report.test.js.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));
const LOG_TAIL_LINES = 80;

// Error messages that mean the SOURCE is down/blocking, not that our code is
// wrong. `http \d{3}` covers 4xx/5xx throws from fetch.js; the rest are Node
// connection/TLS failure codes surfaced via the `[cause: ...]` detail line.
const NETWORK_RE = /\bhttp [45]\d{2}\b|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|EPROTO|UND_ERR|UNABLE_TO_VERIFY|CERT_|certificate|\bTLS\b|\btimeout\b|fetch failed/i;

// Lines fetch.js prints on every failed attempt — their presence alongside an
// empty crawl points at an outage rather than a layout change.
const FETCH_FAIL_LINE_RE = /^\s*fetch failed \(/m;

function tail(text, lines = LOG_TAIL_LINES) {
  if (!text) return '';
  const all = text.split(/\r?\n/);
  return all.slice(Math.max(0, all.length - lines)).join('\n').trim();
}

/** Parse the machine-readable `TRIAGE {json}` lines refresh.js emits. */
export function parseTriageLines(log, city) {
  const out = [];
  for (const m of (log || '').matchAll(/^TRIAGE (\{.*\})\s*$/gm)) {
    try {
      const obj = JSON.parse(m[1]);
      if (!city || obj.city === city) out.push(obj);
    } catch { /* malformed line — ignore, prose log still has the story */ }
  }
  return out;
}

/**
 * Decide whether a city is broken and why. Returns null when healthy, else:
 * { schema, city, classification, headline, phase, run_url, run_id,
 *   detected_at, prev_meta, evidence[], log_tail, artifact_name }
 *
 * Rules are ORDERED — first match wins (see the plan in the repo docs):
 *   1. sanity step failed            → sanity-failure
 *   2. refresh cancelled/killed      → timeout
 *   3. TRIAGE line (throw)           → source-unreachable | adapter-error
 *      TRIAGE line (empty-crawl)     → source-unreachable | layout-change
 *   4. green but meta counts crashed → layout-change (low confidence)
 *   5. otherwise                     → healthy (null)
 */
export function classifyCity({
  city, refreshOutcome, sanityOutcome,
  refreshLog = '', sanityLog = '', prevMeta = null, newMeta = null,
  runUrl = '', runId = null,
}) {
  const base = {
    schema: 1,
    city,
    phase: 'refresh',
    run_url: runUrl,
    run_id: runId,
    detected_at: new Date().toISOString(),
    prev_meta: prevMeta ? pickCounts(prevMeta) : null,
    artifact_name: `triage-${city}`,
  };
  const done = (classification, headline, evidence, logText = refreshLog) => ({
    ...base, classification, headline, evidence, log_tail: tail(logText),
  });

  // 1. Sanity gate failed — the parser produced junk-shaped data.
  if (sanityOutcome === 'failure') {
    const evidence = (sanityLog.match(/^.*\[[a-z-]+\].*$/gm) || []).slice(0, 20);
    const classes = [...new Set((sanityLog.match(/\[([a-z-]+)\]/g) || []))];
    return done(
      'sanity-failure',
      `sanity gate failed (${classes.join(', ') || 'see log'}) — data commit blocked`,
      evidence,
      sanityLog || refreshLog,
    );
  }

  const triage = parseTriageLines(refreshLog, city);

  // 2. Hard-killed: step cancelled, or exit 1 with a log that just stops
  //    (no per-city summary, no TRIAGE line — refresh.js always prints one of
  //    those before returning, so their absence means the process died).
  const endedMidCrawl = !triage.length && !/--- summary/m.test(refreshLog);
  if (refreshOutcome === 'cancelled' || (refreshOutcome === 'failure' && endedMidCrawl)) {
    return done('timeout', 'job timed out or was killed mid-crawl (infra)', []);
  }

  // 3. refresh.js told us exactly what happened.
  if (triage.length) {
    const t = triage[triage.length - 1];
    const msg = t.message || '';
    if (t.kind === 'throw') {
      if (NETWORK_RE.test(msg)) {
        return done('source-unreachable', `source unreachable (${msg})`, [msg]);
      }
      return done('adapter-error', `adapter error (${msg})`, [msg]);
    }
    if (t.kind === 'empty-crawl') {
      const prevN = t.prev_properties ?? prevMeta?.unique_properties ?? '?';
      if (FETCH_FAIL_LINE_RE.test(refreshLog) || NETWORK_RE.test(refreshLog)) {
        return done(
          'source-unreachable',
          `crawl returned empty with network errors — source likely down (${prevN} properties preserved)`,
          [`empty crawl; ${prevN} previously-published properties preserved`],
        );
      }
      return done(
        'layout-change',
        `layout change suspected (crawl fetched OK but parsed 0 records; ${prevN} expected)`,
        [`empty crawl with no fetch errors; ${prevN} previously-published properties preserved`],
      );
    }
  }

  // 4. Everything looked green — compare counts. A big silent shrink usually
  //    means the parser now misses most of the board (partial layout change).
  if (prevMeta && newMeta) {
    const prev = prevMeta.unique_properties ?? 0;
    const cur = newMeta.unique_properties ?? 0;
    if (prev > 0 && cur === 0) {
      return done('layout-change', `layout change suspected (unique_properties ${prev} → 0)`,
        [`unique_properties dropped ${prev} → 0 with a green run`]);
    }
    // merge-history means unique_properties normally only GROWS; a >60% drop
    // on a green run is a rebuilt/misparsed dataset, not organic churn.
    if (prev >= 5 && cur < prev * 0.4) {
      return done('layout-change',
        `layout change suspected (unique_properties ${prev} → ${cur}, −${Math.round((1 - cur / prev) * 100)}%)`,
        [`LOW CONFIDENCE: counts shrank sharply on a green run — verify before touching the parser`]);
    }
  }

  return null; // healthy
}

function pickCounts(meta) {
  const { generated_at, unique_properties, active_auctions, active_listings,
          wykaz_entries, land_plots, parser_version, stale } = meta;
  return { generated_at, unique_properties, active_auctions, active_listings,
           wykaz_entries, land_plots, parser_version, stale };
}

export function renderTitle(f) {
  return `[city-broken] ${f.city}: ${f.headline}`;
}

export function renderIssueBody(f) {
  const prev = f.prev_meta;
  const prevLine = prev
    ? `unique_properties: ${prev.unique_properties} · active_auctions: ${prev.active_auctions} · active_listings: ${prev.active_listings} · generated_at: ${prev.generated_at}`
    : '_no previously-published data (first-run adapter?)_';
  const adapterDir = `pipeline/src/cities/${f.city}`;
  const evidence = (f.evidence || []).map((e) => `- ${e}`).join('\n');
  const artifactNote = f.phase === 'health'
    ? '_(health-check finding — no crawl artifact; see the latest refresh run for this city)_'
    : `artifact \`${f.artifact_name}\` on the run above (\`snapshots/\` = raw fetched HTML/PDF bytes, \`refresh.log\` = full log)`;

  return `<!-- triage-bot city:${f.city} -->
## ${f.city} is broken — ${f.classification}

| | |
|---|---|
| **City** | ${f.city} |
| **Classification** | ${f.classification} — ${f.headline} |
| **Detected** | ${f.detected_at}, [workflow run](${f.run_url}) |
| **Failure snapshot** | ${artifactNote} |
| **Last-good meta** | ${prevLine} |

${evidence ? `### Evidence\n${evidence}\n` : ''}
### Log excerpt

\`\`\`text
${f.log_tail || '(no log captured — job was killed before output was saved)'}
\`\`\`

### Triage prompt (paste into Claude Code)

\`\`\`text
Triage a broken city adapter in this repo (przetargimiejskie — Polish municipal
auction scraper, Node 20 ESM pipeline in pipeline/).

City: ${f.city}
Classification: ${f.classification} — ${f.headline}
Last-good counts (data/${f.city}/meta.json): ${prev ? JSON.stringify(pickCounts(prev)) : 'none (first run)'}

Adapter files:
- ${adapterDir}/config.js   (source URLs, flags)
- ${adapterDir}/crawl.js    (board/document discovery)
- ${adapterDir}/parse.js    (record extraction)
- pipeline/tests/parse-${f.city}.test.js   (groundtruth fixtures)

Error log tail:
${f.log_tail || '(none captured)'}

${f.phase === 'health' ? '' : `The workflow artifact \`${f.artifact_name}\` on ${f.run_url} contains snapshots/
with the exact HTML/PDF bytes the crawler fetched when it broke.
`}
Steps:
1. Check the source URLs in config.js are reachable (curl -sI <url>) — if the
   source is down, this is an outage, not a code bug; note it and stop.
2. Fetch the current board page and diff its structure against the selectors /
   regexes crawl.js and parse.js expect (compare with the snapshot artifact).
3. Reproduce locally: cd pipeline && CITY=${f.city} npm run refresh
4. Run the parser tests: cd pipeline && node --test tests/parse-${f.city}.test.js
5. If the failure was the sanity gate: node scripts/sanity-check.js ${f.city} —
   fix the parser; only touch ALLOWLIST for a source-verified genuine outlier.
6. Fix crawl.js/parse.js minimally, update/add a fixture in the test file, keep
   test output quiet, and confirm the refresh summary counts look sane before
   committing. Do NOT weaken the preserve-on-empty or per-city isolation logic
   in pipeline/src/refresh.js.
\`\`\`

---
*Automated by the triage job (refresh.yml/health.yml). This issue is updated on
every failing run and auto-closed when ${f.city} refreshes green.*
`;
}

// ---- CLI -------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] ?? '';
  }
  return args;
}

function readIf(path) {
  try { return path && existsSync(path) ? readFileSync(path, 'utf8') : ''; }
  catch { return ''; }
}

function readJsonIf(path) {
  try { return path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null; }
  catch { return null; }
}

function writeFailure(outDir, failure) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'failure.json'), JSON.stringify(failure, null, 2) + '\n');
  writeFileSync(join(outDir, 'issue-body.md'), renderIssueBody(failure));
  console.error(`triage: ${failure.city} BROKEN — ${failure.classification}: ${failure.headline}`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parseArgs(rest);

  if (cmd === 'classify') {
    const city = a.city;
    const failure = classifyCity({
      city,
      refreshOutcome: a['refresh-outcome'] || 'success',
      sanityOutcome: a['sanity-outcome'] || 'success',
      refreshLog: readIf(a['refresh-log']),
      sanityLog: readIf(a['sanity-log']),
      prevMeta: readJsonIf(a['prev-meta']),
      newMeta: readJsonIf(a['new-meta']) ?? readJsonIf(join(DATA_DIR, city, 'meta.json')),
      runUrl: a['run-url'] || '',
      runId: a['run-id'] || null,
    });
    if (failure) writeFailure(a['out-dir'] || '.', failure);
    else console.error(`triage: ${city} healthy`);
    return;
  }

  if (cmd === 'synthesize') {
    const city = a.city;
    writeFailure(a['out-dir'] || '.', {
      schema: 1,
      city,
      classification: a.classification || 'timeout',
      headline: a.headline || 'matrix job failed or was cancelled before triage could run (timeout/infra)',
      phase: 'refresh',
      run_url: a['run-url'] || '',
      run_id: a['run-id'] || null,
      detected_at: new Date().toISOString(),
      prev_meta: readJsonIf(join(DATA_DIR, city, 'meta.json')),
      evidence: ['no triage artifact was uploaded — the job was killed before its always() classify step'],
      log_tail: '',
      artifact_name: `triage-${city}`,
    });
    return;
  }

  if (cmd === 'render') {
    const failure = readJsonIf(a.failure);
    if (!failure) { console.error(`triage: cannot read ${a.failure}`); return; }
    writeFileSync(a.out || 'issue-body.md', renderIssueBody(failure));
    return;
  }

  console.error('usage: triage-report.js classify|synthesize|render [--flags]  (see file header)');
}

// Only run the CLI when executed directly, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (err) {
    // Never fail the caller — triage is best-effort observability.
    console.error(`triage: error (${err?.message || err}) — continuing without a report`);
  }
}
