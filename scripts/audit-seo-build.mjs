#!/usr/bin/env node
// Fail a deploy when the generated sitemap promises an HTML page that is not
// actually indexable. This checks the assembled output (not just the template),
// so it covers generated city/property/month pages and hand-written site pages.
//
// Usage: node scripts/audit-seo-build.mjs [outDir]

// No dependencies: this runs on the same plain Node installation as the SEO
// builder in build-site.sh.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const OUT = resolve(process.argv[2] || '_site');
const SITE = 'https://przetargimiejskie.pl';
const SITEMAP = join(OUT, 'sitemap.xml');

const fail = (message) => {
  console.error(`  seo audit: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!existsSync(SITEMAP)) {
  fail(`missing ${SITEMAP}`);
  process.exit();
}

const xml = readFileSync(SITEMAP, 'utf8');
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

if (!locs.length) fail('sitemap contains no URLs');

const uniqueLocs = new Set();
const duplicateLocs = new Set();
for (const loc of locs) {
  if (uniqueLocs.has(loc)) duplicateLocs.add(loc);
  else uniqueLocs.add(loc);
}
if (duplicateLocs.size) fail(`duplicate sitemap URL(s), e.g. ${duplicateLocs.values().next().value}`);

const today = new Date().toISOString().slice(0, 10);
for (const match of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
  const value = match[1].trim();
  const datePart = value.slice(0, 10);
  const parsedDate = new Date(`${datePart}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
      || Number.isNaN(parsedDate.valueOf())
      || parsedDate.toISOString().slice(0, 10) !== datePart) {
    fail(`invalid <lastmod> value ${JSON.stringify(value)}`);
  } else if (datePart > today) {
    fail(`future <lastmod> ${value} (today is ${today})`);
  }
}

const seenCanonicals = new Map();
let checked = 0;

for (const loc of locs) {
  let url;
  try {
    url = new URL(loc);
  } catch {
    fail(`invalid sitemap URL ${JSON.stringify(loc)}`);
    continue;
  }

  if (url.origin !== SITE) {
    fail(`off-origin sitemap URL ${loc}`);
    continue;
  }
  if (url.search || url.hash) fail(`non-canonical query/hash in sitemap URL ${loc}`);
  if (!url.pathname.endsWith('/')) fail(`sitemap URL lacks the canonical trailing slash: ${loc}`);

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    fail(`invalid percent-encoding in sitemap URL ${loc}`);
    continue;
  }

  const htmlPath = resolve(join(OUT, pathname.replace(/^\/+/, ''), 'index.html'));
  if (htmlPath !== OUT && !htmlPath.startsWith(`${OUT}${sep}`)) {
    fail(`sitemap path escapes the build directory: ${loc}`);
    continue;
  }
  if (!existsSync(htmlPath)) {
    fail(`sitemap URL has no built index.html: ${loc}`);
    continue;
  }

  const html = readFileSync(htmlPath, 'utf8');
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  if (!canonical) fail(`missing canonical in ${loc}`);
  else if (canonical !== loc) fail(`canonical mismatch in ${loc}: ${canonical}`);

  const robotsContent = [...html.matchAll(/<meta\s+[^>]*name=["'](?:robots|googlebot)["'][^>]*>/gi)]
    .map((match) => match[0])
    .join(' ');
  if (/noindex/i.test(robotsContent)) fail(`sitemap URL is noindex: ${loc}`);

  if (canonical) {
    const previous = seenCanonicals.get(canonical);
    if (previous && previous !== loc) fail(`canonical ${canonical} is shared by ${previous} and ${loc}`);
    else seenCanonicals.set(canonical, loc);
  }
  checked += 1;
}

if (process.exitCode) process.exit();
console.error(`  seo audit: OK — ${checked} sitemap URLs have a built page, self-canonical and no noindex`);
