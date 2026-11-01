import fs from 'node:fs';
import dns from 'node:dns/promises';
import { getText } from '../src/core/fetch.js';
import { detectCityPlatform, onboardCity } from './batch-onboard.js';

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

export async function probeCity(city) {
  try {
    const fromSpike = await detectCityPlatform(city);
    if (fromSpike) return fromSpike;
  } catch (e) {}

  const clean = city.id.replace(/-/g, '');
  const base = city.id.replace(/-\d+$/, '').replace(/-/g, '');

  const candidates = [
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
    `${clean}.biuletyn.net`,
    `${base}.biuletyn.net`,
    `bip.${clean}.biuletyn.net`,
    `bip.${clean}.finn.pl`,
    `bip.${base}.finn.pl`,
    `bip.${city.id}.finn.pl`,
  ];

  if (city.voivodeship === 'lubelskie') {
    candidates.unshift(`um${clean}.bip.lubelskie.pl`, `umig${clean}.bip.lubelskie.pl`, `ug${clean}.bip.lubelskie.pl`, `um${base}.bip.lubelskie.pl`, `ug${base}.bip.lubelskie.pl`);
  }
  if (city.voivodeship === 'wielkopolskie') {
    candidates.unshift(`bip3.wokiss.pl/${clean}/`, `bip3.wokiss.pl/${clean}m/`, `bip3.wokiss.pl/${base}m/`);
  }

  for (const cand of candidates) {
    const host = cand.split('/')[0];
    if (!(await resolves(host))) continue;

    let html = '';
    const fullUrl = `https://${cand}`;
    try {
      html = await getText(fullUrl, { userAgent: BROWSER_UA, timeoutMs: 1500, retries: 0 });
    } catch (e) {
      continue;
    }

    const lower = html.toLowerCase();

    // 1. BiuletynNet
    if (host.includes('biuletyn.net') || lower.includes('biuletyn.net')) {
      let defaultCid = 70;
      const mCid = fullUrl.match(/cid=(\d+)/) || html.match(/href="[^"]*cid=(\d+)[^"]*"[^>]*>[^<]*przetarg/i);
      if (mCid) defaultCid = Number(mCid[1]);
      return {
        engine: 'biuletynnet',
        engineModule: '../../core/biuletynnet-bip.js',
        engineFactory: 'makeBiuletynNetCity',
        host,
        origin: `https://${host}`,
        defaultCid,
        source: `https://${host}/?bip=1&cid=${defaultCid}&bsc=N`,
      };
    }

    // 2. Logonet
    if (lower.includes('logonet') || html.includes('author" content="Logonet') || lower.includes('/przetargi-nieruchomosci/')) {
      let boardUrl = `https://${host}/przetargi-nieruchomosci/376`;
      const mBoard = html.match(/href="([^"]*\/przetargi-nieruchomosci\/(\d+)[^"]*)"/i) || html.match(/href="([^"]*\/artykuly\/(\d+)\/przetargi[^"]*)"/i);
      if (mBoard) {
        boardUrl = mBoard[1].startsWith('http') ? mBoard[1] : `https://${host}${mBoard[1].startsWith('/') ? '' : '/'}${mBoard[1]}`;
      }
      return {
        engine: 'logonet',
        engineModule: '../../core/logonet-bip.js',
        engineFactory: 'makeLogonetCity',
        host,
        origin: `https://${host}`,
        boardUrl,
        source: boardUrl,
      };
    }

    // 3. MADKOM
    if (lower.includes('madkom') || lower.includes('data-ng-app="app"') || lower.includes('/api/contexts/')) {
      return {
        engine: 'madkom',
        engineModule: '../../core/madkom-bip.js',
        engineFactory: 'makeMadkomCity',
        host,
        origin: `https://${host}`,
        context: 'default',
        source: `https://${host}`,
      };
    }

    // 4. SystemDoBIP
    if (lower.includes('systemdobip') || lower.includes('e-line') || (lower.includes('/przetargi/') && lower.includes('/status/'))) {
      let boardId = 361;
      const mBoard = html.match(/\/przetargi\/(\d+)\//);
      if (mBoard) boardId = Number(mBoard[1]);
      return {
        engine: 'systemdobip',
        engineModule: '../../core/systemdobip.js',
        engineFactory: 'makeSystemDoBipCity',
        host,
        origin: `https://${host}`,
        boardId,
        source: `https://${host}/przetargi/${boardId}/status/0/`,
      };
    }

    // 5. BIP Lubelskie
    if (host.includes('bip.lubelskie.pl') || lower.includes('bip.lubelskie.pl') || lower.includes('action=list-ajax') || lower.includes('pobierz_przetargi')) {
      return {
        engine: 'biplubelskie',
        engineModule: '../../core/biplubelskie-bip.js',
        engineFactory: 'makeBipLubelskieCity',
        host,
        origin: `https://${host}`,
        menuId: 413,
        source: `https://${host}`,
      };
    }

    // 6. FINN
    if (host.includes('.finn.pl') || lower.includes('finn.pl') || lower.includes('/bipkod/')) {
      return {
        engine: 'finn',
        engineModule: '../../core/finn-bip.js',
        engineFactory: 'makeFinnCity',
        host,
        origin: `https://${host}`,
        boardUrl: fullUrl,
        source: fullUrl,
      };
    }

    // 7. WOKISS
    if (host.includes('wokiss.pl') || lower.includes('wokiss')) {
      return {
        engine: 'wokiss',
        engineModule: '../../core/wokiss-bip.js',
        engineFactory: 'makeWokissCity',
        host,
        origin: `https://${host}`,
        boardUrl: fullUrl,
        source: fullUrl,
      };
    }
  }

  return null;
}

export async function runScan(targetCount = 50, concurrency = 15) {
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const unbuilt = master.cities.filter(c => c.status !== 'built' && c.status !== 'no-build' && c.status !== 'dropped' && c.status !== 'deferred');
  console.log(`Scanning among ${unbuilt.length} unresearched cities... Target: ${targetCount}, Concurrency: ${concurrency}`);

  let builtCount = 0;
  let idx = 0;

  async function worker() {
    while (idx < unbuilt.length && builtCount < targetCount) {
      const city = unbuilt[idx++];
      try {
        const p = await probeCity(city);
        if (p && builtCount < targetCount) {
          console.log(`[SCAN] Found ${city.label} (${city.id}): ${p.engine} on ${p.host}`);
          const ok = await onboardCity(city.id, { platform: p });
          if (ok) {
            builtCount++;
            console.log(`[SCAN PROGRESS] Built ${builtCount}/${targetCount}: ${city.label}`);
          }
        }
      } catch (e) {
        console.error(`[SCAN] Error on ${city.id}:`, e.message);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nScan finished: onboarded ${builtCount} new cities!`);
  return builtCount;
}

if (process.argv[1] && process.argv[1].endsWith('national-scan.mjs')) {
  const count = Number(process.argv[2]) || 50;
  const conc = Number(process.argv[3]) || 15;
  runScan(count, conc).catch(console.error);
}
