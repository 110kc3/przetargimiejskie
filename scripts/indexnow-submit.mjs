#!/usr/bin/env node
// IndexNow submitter — pushes URLs to Bing/Yandex/Seznam the moment they change,
// instead of waiting to be crawled.
//
//   node scripts/indexnow-submit.mjs [--dry-run] [--sitemap <url|path>] [--limit N]
//
// Why this exists: as of August 2026 the site has ~2 300 well-formed pages and
// close to zero of them indexed anywhere, because a 10-week-old domain with no
// backlinks gives a crawler no reason to come looking. IndexNow inverts that —
// we tell the engines, they don't have to discover us. It needs no account, no
// API key and no dashboard: ownership is proved by serving a key file.
//
// This does NOT cover Google, which never joined IndexNow. Google is Search
// Console + sitemap submission, which is a manual account step (see TODO §4).
//
// The key file must stay reachable at https://przetargimiejskie.pl/<key>.txt and
// contain exactly the key, no trailing newline — engines fetch it on every submit
// and reject the batch if it 404s or mismatches. It lives in site/ so the normal
// build/deploy publishes it; there is nothing to do at release time.
//
// Submitting unchanged URLs repeatedly is discouraged by the spec and can get a
// host rate-limited, so the default is a full submit (correct for the first run,
// and after that only worth repeating when the sitemap actually grows). For the
// routine case pass --limit, or wire this to the changed-city list from a refresh.

import { readFileSync, existsSync } from 'node:fs';

const KEY = 'd69b65d9b31a3b7c9c794c9f2ffb5d7b';
const HOST = 'przetargimiejskie.pl';
const SITE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
// The spec caps a single POST at 10 000 URLs. We're well under that today, but a
// nationwide long-tail build would cross it, so chunk rather than silently drop.
const MAX_PER_REQUEST = 10_000;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f, fallback) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const dryRun = has('--dry-run');
const source = valueOf('--sitemap', `${SITE}/sitemap.xml`);
const limit = Number(valueOf('--limit', '0')) || 0;

// ---------- collect URLs ----------

async function loadSitemap(src) {
  if (existsSync(src)) return readFileSync(src, 'utf8');
  const res = await fetch(src);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status} ${res.statusText} (${src})`);
  return res.text();
}

const xml = await loadSitemap(source);
let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

// An engine rejects the whole batch if any URL is off-host, so drop foreign ones
// loudly rather than letting one stray entry fail 2 300 good submissions.
const foreign = urls.filter((u) => !u.startsWith(`${SITE}/`) && u !== SITE);
if (foreign.length) {
  console.error(`  indexnow: skipping ${foreign.length} off-host URL(s), e.g. ${foreign[0]}`);
  urls = urls.filter((u) => u.startsWith(`${SITE}/`) || u === SITE);
}

if (!urls.length) throw new Error(`no URLs found in ${source}`);
if (limit) urls = urls.slice(0, limit);

console.error(`  indexnow: ${urls.length} URL(s) from ${source}`);

// ---------- verify the key file is actually live ----------

// Checked before submitting, not after a rejection: the engines fetch the key
// file themselves, so if it isn't published the whole batch fails with an opaque
// 403 and no indication of which of the two halves is wrong.
if (!dryRun) {
  const keyUrl = `${SITE}/${KEY}.txt`;
  const res = await fetch(keyUrl);
  const body = res.ok ? (await res.text()).trim() : '';
  if (!res.ok || body !== KEY) {
    throw new Error(
      `key file not live or wrong contents at ${keyUrl} ` +
        `(status ${res.status}, body ${JSON.stringify(body.slice(0, 40))}). ` +
        `Deploy site/${KEY}.txt before submitting.`,
    );
  }
  console.error(`  indexnow: key file verified at ${keyUrl}`);
}

// ---------- submit ----------

if (dryRun) {
  console.error('  indexnow: --dry-run, not submitting. First 5 URLs:');
  for (const u of urls.slice(0, 5)) console.error(`    ${u}`);
  process.exit(0);
}

let submitted = 0;
for (let i = 0; i < urls.length; i += MAX_PER_REQUEST) {
  const batch = urls.slice(i, i + MAX_PER_REQUEST);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
  });

  // 200 = accepted, 202 = accepted but key still being validated. Both are fine;
  // anything else is worth failing on so a broken submit can't pass silently.
  if (res.status !== 200 && res.status !== 202) {
    const detail = await res.text().catch(() => '');
    throw new Error(`indexnow rejected batch: ${res.status} ${res.statusText} ${detail.slice(0, 200)}`);
  }
  submitted += batch.length;
  console.error(`  indexnow: submitted ${batch.length} URL(s) → ${res.status}`);
}

console.error(`  indexnow: done, ${submitted} URL(s) submitted`);
