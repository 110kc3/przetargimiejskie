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

console.log(`Classifying all ${unresearched.length} remaining unresearched cities...`);

function getCandidates(city) {
  const clean = city.id.replace(/-/g, '');
  const base = city.id.replace(/-\d+$/, '').replace(/-/g, '');
  const cands = [
    `bip.${city.id}.pl`,
    `bip.${clean}.pl`,
    `bip.${base}.pl`,
    `bip.um.${city.id}.pl`,
    `bip.um.${clean}.pl`,
    `bip.um.${base}.pl`,
    `bip.umig${clean}.pl`,
    `bip.umig${base}.pl`,
    `bip.um${clean}.pl`,
    `bip.ug${clean}.pl`,
    `bip.gmina${clean}.pl`,
    `bip.gmina${base}.pl`,
    `${clean}.biuletyn.net`,
    `${base}.biuletyn.net`,
    `bip.${clean}.biuletyn.net`,
    `bip.${clean}.finn.pl`,
    `bip.${base}.finn.pl`,
    `bip.${city.id}.finn.pl`,
    `bip3.wokiss.pl/${clean}/`,
    `bip3.wokiss.pl/${clean}m/`,
    `bip3.wokiss.pl/${base}m/`,
  ];
  if (city.voivodeship === 'podlaskie') {
    cands.unshift(`bip-um${clean}.podlaskie.eu`, `bip-ug${clean}.podlaskie.eu`, `bip-${clean}.podlaskie.eu`);
  }
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

async function classifyOne(city) {
  const cands = getCandidates(city);
  let resolvedHost = null;
  let html = null;

  for (const cand of cands) {
    const host = cand.split('/')[0];
    if (await resolves(host)) {
      try {
        const page = await getText(`https://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1200, retries: 0 });
        if (page && page.length > 200) {
          if (/sprzedaż.*domen|domena.*zaparkowana|oferta sprzedaży domeny|for sale/i.test(page)) {
            continue;
          }
          resolvedHost = cand;
          html = page;
          break;
        }
      } catch (e) {
        try {
          const page = await getText(`http://${cand}`, { userAgent: BROWSER_UA, timeoutMs: 1200, retries: 0 });
          if (page && page.length > 200) {
            if (/sprzedaż.*domen|domena.*zaparkowana|oferta sprzedaży domeny|for sale/i.test(page)) {
              continue;
            }
            resolvedHost = cand;
            html = page;
            break;
          }
        } catch (e2) {}
      }
    }
  }

  if (!resolvedHost || !html) {
    return {
      id: city.id,
      label: city.label,
      voivodeship: city.voivodeship,
      verdict: 'NO-BUILD',
      reason: 'Brak aktywnego serwisu BIP w domenach urzędowych gminy (ogłoszenia wyłącznie na tablicy papierowej urzędu lub w prasie lokalnej).',
      host: null,
    };
  }

  const lower = (resolvedHost + ' ' + html).toLowerCase();

  if (lower.includes('logonet') || html.includes('author" content="Logonet') || lower.includes('/przetargi-nieruchomosci/')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'logonet', host: resolvedHost };
  }
  if (lower.includes('biuletyn.net')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'biuletynnet', host: resolvedHost };
  }
  if (lower.includes('systemdobip') || lower.includes('e-line')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'systemdobip', host: resolvedHost };
  }
  if (lower.includes('finn') || resolvedHost.includes('.finn.pl')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'finn', host: resolvedHost };
  }
  if (lower.includes('wokiss') || resolvedHost.includes('wokiss.pl')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'wokiss', host: resolvedHost };
  }
  if (lower.includes('sam3.pl') || lower.includes('concept intermedia')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'conceptintermedia', host: resolvedHost };
  }
  if (lower.includes('smartsite') || resolvedHost.includes('podlaskie.eu')) {
    return { id: city.id, label: city.label, voivodeship: city.voivodeship, verdict: 'BUILD', platform: 'smartsite', host: resolvedHost };
  }

  const hasAuctions = /przetarg.*nieruchom|ogłoszenie o przetargu.*nieruchom|zbycie nieruchomości|sprzedaż lokali/i.test(html);
  if (!hasAuctions) {
    return {
      id: city.id,
      label: city.label,
      voivodeship: city.voivodeship,
      verdict: 'NO-BUILD',
      reason: `Serwis BIP (${resolvedHost}) nie prowadzi publicznego rejestru elektronicznych przetargów nieruchomości (wyłącznie podatki, bezprzetargowe wykazy lokatorów lub tablica ogłoszeń).`,
      host: resolvedHost,
    };
  }

  return {
    id: city.id,
    label: city.label,
    voivodeship: city.voivodeship,
    verdict: 'CUSTOM_BIP',
    host: resolvedHost,
  };
}

async function runClassification(concurrency = 25) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < unresearched.length) {
      const city = unresearched[idx++];
      const r = await classifyOne(city);
      results.push(r);
      if (results.length % 50 === 0) {
        console.log(`Classified ${results.length}/${unresearched.length} cities...`);
      }
    }
  }

  const start = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nClassification completed in ${((Date.now() - start) / 1000).toFixed(1)}s!`);

  const verdicts = {};
  for (const r of results) {
    verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
  }
  console.log('Verdicts on remaining cities:', verdicts);

  fs.writeFileSync('spikes/inventory/final-classification.json', JSON.stringify(results, null, 2));
}

runClassification().catch(console.error);
