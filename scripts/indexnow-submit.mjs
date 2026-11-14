#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';

const KEY = 'd69b65d9b31a3b7c9c794c9f2ffb5d7b';
const HOST = 'przetargimiejskie.pl';
const SITE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
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


async function loadSitemap(src) {
  if (existsSync(src)) return readFileSync(src, 'utf8');
  const res = await fetch(src);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status} ${res.statusText} (${src})`);
  return res.text();
}

const xml = await loadSitemap(source);
let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const foreign = urls.filter((u) => !u.startsWith(`${SITE}/`) && u !== SITE);
if (foreign.length) {
  console.error(`  indexnow: skipping ${foreign.length} off-host URL(s), e.g. ${foreign[0]}`);
  urls = urls.filter((u) => u.startsWith(`${SITE}/`) || u === SITE);
}

if (!urls.length) throw new Error(`no URLs found in ${source}`);
if (limit) urls = urls.slice(0, limit);

console.error(`  indexnow: ${urls.length} URL(s) from ${source}`);


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

  if (res.status !== 200 && res.status !== 202) {
    const detail = await res.text().catch(() => '');
    throw new Error(`indexnow rejected batch: ${res.status} ${res.statusText} ${detail.slice(0, 200)}`);
  }
  submitted += batch.length;
  console.error(`  indexnow: submitted ${batch.length} URL(s) → ${res.status}`);
}

console.error(`  indexnow: done, ${submitted} URL(s) submitted`);
