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

console.log(`Surveying ${unresearched.length} remaining unresearched cities...`);

function getCandidates(city) {
  const clean = city.id.replace(/-/g, '');
  const base = city.id.replace(/-\d+$/, '').replace(/-/g, '');
  const cands = [
    `bip.${city.id}.pl`,
    `bip.um.${city.id}.pl`,
    `bip.umig${clean}.pl`,
    `bip.um${clean}.pl`,
    `bip.ug${clean}.pl`,
    `bip.gmina${clean}.pl`,
    `bip.${base}.pl`,
    `bip.um.${base}.pl`,
    `bip.umig${base}.pl`,
    `bip.um${base}.pl`,
    `bip.ug${base}.pl`,
    `bip.gmina${base}.pl`,
    `${clean}.biuletyn.net`,
    `${base}.biuletyn.net`,
    `bip.${clean}.biuletyn.net`,
    `bip.${clean}.finn.pl`,
    `bip.${base}.finn.pl`,
    `bip.${city.id}.finn.pl`,
  ];
  if (city.voivodeship === 'warminsko-mazurskie') {
    cands.unshift(
      `bip.${clean}.warmia.mazury.pl`,
      `bip.${base}.warmia.mazury.pl`,
      `bip.um.${clean}.warmia.mazury.pl`,
      `bip.umig${clean}.warmia.mazury.pl`,
    );
  }
  return [...new Set(cands)];
}

async function surveyCity(city) {
  const cands = getCandidates(city);
  let resolvedHost = null;
  let html = null;

  for (const cand of cands) {
    const host = cand.split('/')[0];
    if (await resolves(host)) {
      try {
        const page = await getText(`https://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1500, retries: 0 });
        if (page && page.length > 200) {
          resolvedHost = cand;
          html = page;
          break;
        }
      } catch (e) {
        try {
          const page = await getText(`http://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1500, retries: 0 });
          if (page && page.length > 200) {
            resolvedHost = cand;
            html = page;
            break;
          }
        } catch (e2) {}
      }
    }
  }

  if (!resolvedHost || !html) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, status: 'NO_HOST' };
  }

  const lower = (resolvedHost + ' ' + html).toLowerCase();
  let platform = 'unknown';

  if (lower.includes('logonet') || html.includes('author" content="Logonet') || lower.includes('/przetargi-nieruchomosci/')) {
    platform = 'logonet';
  } else if (lower.includes('biuletyn.net')) {
    platform = 'biuletynnet';
  } else if (lower.includes('systemdobip') || lower.includes('e-line')) {
    platform = 'systemdobip';
  } else if (lower.includes('finn') || resolvedHost.includes('.finn.pl')) {
    platform = 'finn';
  } else if (lower.includes('wokiss') || resolvedHost.includes('wokiss.pl')) {
    platform = 'wokiss';
  } else if (lower.includes('sam3.pl') || lower.includes('concept intermedia')) {
    platform = 'conceptintermedia';
  } else if (lower.includes('warmia.mazury.pl')) {
    platform = 'warmia-mazury';
  } else if (lower.includes('e-bip.pl')) {
    platform = 'ebip';
  } else if (lower.includes('madkom') || lower.includes('data-ng-app="app"')) {
    platform = 'madkom';
  }

  const hasAuctions = /przetarg|nieruchom|zbycie/i.test(html);

  return {
    id: city.id,
    label: city.label,
    voivodeship: city.voivodeship,
    host: resolvedHost,
    platform,
    hasAuctions,
  };
}

async function runSurvey(concurrency = 25) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < unresearched.length) {
      const city = unresearched[idx++];
      const r = await surveyCity(city);
      results.push(r);
      if (results.length % 50 === 0) {
        console.log(`Surveyed ${results.length}/${unresearched.length} cities...`);
      }
    }
  }

  const start = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nSurvey completed in ${((Date.now() - start) / 1000).toFixed(1)}s!`);

  const summary = {};
  for (const r of results) {
    const key = r.status || r.platform;
    summary[key] = (summary[key] || 0) + 1;
  }
  console.log('Platform distribution of remaining unresearched:', summary);

  fs.writeFileSync('spikes/inventory/unresearched-survey.json', JSON.stringify(results, null, 2));
  console.log('Saved survey results to spikes/inventory/unresearched-survey.json');
}

runSurvey().catch(console.error);
