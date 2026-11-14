import fs from 'node:fs';
import dns from 'node:dns/promises';
import { getText } from '../../pipeline/src/core/fetch.js';

const MASTER_PATH = 'spikes/master-cities.json';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function resolves(host) {
  try {
    await dns.lookup(host);
    return true;
  } catch (e) {
    return false;
  }
}

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
const unresearched = master.cities.filter(c => c.status === 'unresearched');

console.log(`Total unresearched cities: ${unresearched.length}`);

function getCandidates(c) {
  const clean = c.id.replace(/-/g, '');
  const base = c.id.replace(/-\d+$/, '').replace(/-/g, '');
  const cands = [
    `bip.${c.id}.pl`,
    `bip.um.${c.id}.pl`,
    `bip.umig${clean}.pl`,
    `bip.um${clean}.pl`,
    `bip.ugim${clean}.pl`,
    `bip.gmina${clean}.pl`,
    `bip.${base}.pl`,
    `bip.um.${base}.pl`,
    `bip.umig${base}.pl`,
    `bip.um${base}.pl`,
    `bip.gmina${base}.pl`,
    `bip.${c.id}.finn.pl`,
    `bip.${clean}.finn.pl`,
    `bip.${base}.finn.pl`,
    `bip.${c.id}.e-bip.pl`,
    `bip.${clean}.biuletyn.net`,
    `bip.${c.id}.biuletyn.net`,
    `${clean}.biuletyn.net`,
  ];
  if (c.voivodeship === 'lubelskie') {
    cands.unshift(
      `um${clean}.bip.lubelskie.pl`,
      `umig${clean}.bip.lubelskie.pl`,
      `ug${clean}.bip.lubelskie.pl`,
      `um${base}.bip.lubelskie.pl`,
      `umig${base}.bip.lubelskie.pl`,
      `ug${base}.bip.lubelskie.pl`,
    );
  }
  if (c.voivodeship === 'warminsko-mazurskie') {
    cands.unshift(
      `bip.${clean}.warmia.mazury.pl`,
      `bip.${base}.warmia.mazury.pl`,
      `bip.um.${clean}.warmia.mazury.pl`,
      `bip.umig${clean}.warmia.mazury.pl`,
    );
  }
  return [...new Set(cands)];
}

async function probeOne(city) {
  const cands = getCandidates(city);
  for (const cand of cands) {
    if (await resolves(cand)) {
      try {
        const html = await getText(`https://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1500, retries: 0 });
        if (html && html.length > 200) {
          return { city: city.id, host: cand, title: (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '', htmlSnippet: html.slice(0, 1000) };
        }
      } catch (e) {
        try {
          const html = await getText(`http://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1500, retries: 0 });
          if (html && html.length > 200) {
            return { city: city.id, host: cand, title: (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '', htmlSnippet: html.slice(0, 1000) };
          }
        } catch (e2) {}
      }
    }
  }
  return { city: city.id, host: null };
}

async function probeAll(cities, concurrency = 25) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < cities.length) {
      const current = cities[idx++];
      const res = await probeOne(current);
      results.push(res);
      if (results.length % 50 === 0) {
        const found = results.filter(r => r.host).length;
        console.log(`Probed ${results.length}/${cities.length}: ${found} hosts discovered`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const sample = unresearched.slice(0, 40);
console.log(`Testing first ${sample.length} unresearched cities...`);
const start = Date.now();
const res = await probeAll(sample, 25);
console.log(`Completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
const found = res.filter(r => r.host);
console.log(`Discovered ${found.length} active BIP hosts out of ${sample.length}`);

const platformCounts = {};
const otherSamples = [];
for (const item of found) {
  const s = (item.host + ' ' + item.title + ' ' + item.htmlSnippet).toLowerCase();
  let plat = 'other';
  if (s.includes('logonet') || s.includes('author" content="logonet') || s.includes('przetargi-nieruchomosci')) plat = 'logonet';
  else if (s.includes('systemdobip') || s.includes('e-line')) plat = 'systemdobip';
  else if (s.includes('madkom') || s.includes('/api/contexts/')) plat = 'madkom';
  else if (s.includes('bip.lubelskie.pl') || s.includes('pobierz_przetargi')) plat = 'biplubelskie';
  else if (s.includes('finn') || item.host.includes('.finn.pl')) plat = 'finn';
  else if (s.includes('wokiss') || item.host.includes('wokiss.pl')) plat = 'wokiss';
  else if (s.includes('biuletyn.net')) plat = 'biuletynnet';
  else if (s.includes('e-bip.pl')) plat = 'ebip';
  else if (s.includes('warmia.mazury.pl')) plat = 'warmia-mazury';
  platformCounts[plat] = (platformCounts[plat] || 0) + 1;
  if (plat === 'other') {
    const metaGen = (item.htmlSnippet.match(/<meta\s+name=["\x27]generator["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) || [])[1] || '';
    const metaAuthor = (item.htmlSnippet.match(/<meta\s+name=["\x27]author["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) || [])[1] || '';
    otherSamples.push({ city: item.city, host: item.host, title: item.title.trim(), metaGen, metaAuthor, sample: item.htmlSnippet.slice(0, 300).replace(/\s+/g, ' ') });
  }
}
console.log('Platforms discovered:', platformCounts);
console.log('Sample of other platforms (20 items):');
console.table(otherSamples.slice(0, 20));

