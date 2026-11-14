import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import { getText } from '../src/core/fetch.js';
import { onboardCity, detectCityPlatform } from './batch-onboard.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const MASTER_PATH = join(REPO, 'spikes/master-cities.json');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function hostResolves(host) {
  try {
    await dns.lookup(host);
    return true;
  } catch (e) {
    return false;
  }
}

async function findPlatform(city) {
  const detected = await detectCityPlatform(city);
  if (detected) return detected;

  const clean = city.id.replace(/-/g, '');
  const candidateHosts = [
    `bip.${city.id}.pl`,
    `bip.um.${city.id}.pl`,
    `bip.umig${clean}.pl`,
    `bip.um${clean}.pl`,
    `bip.gmina${clean}.pl`,
    `um${clean}.bip.lubelskie.pl`,
  ];

  for (const h of candidateHosts) {
    if (!(await hostResolves(h))) continue;

    let html = '';
    try {
      html = await getText(`https://${h}`, { userAgent: BROWSER_UA, timeoutMs: 2500, retries: 0 });
    } catch (e) {
      continue;
    }

    const lower = html.toLowerCase();

    if (lower.includes('logonet') || html.includes('author" content="Logonet') || lower.includes('/przetargi-nieruchomosci/')) {
      let boardUrl = `https://${h}/przetargi-nieruchomosci/376`;
      const mBoard = html.match(/href="([^"]*\/przetargi-nieruchomosci\/(\d+)[^"]*)"/i) || html.match(/href="([^"]*\/artykuly\/(\d+)\/przetargi[^"]*)"/i);
      if (mBoard) {
        boardUrl = mBoard[1].startsWith('http') ? mBoard[1] : `https://${h}${mBoard[1].startsWith('/') ? '' : '/'}${mBoard[1]}`;
      }
      return {
        engine: 'logonet',
        engineModule: '../../core/logonet-bip.js',
        engineFactory: 'makeLogonetCity',
        host: h,
        origin: `https://${h}`,
        boardUrl,
        source: boardUrl,
      };
    }

    if (h.includes('bip.lubelskie.pl') || lower.includes('bip.lubelskie.pl') || lower.includes('action=list-ajax') || lower.includes('pobierz_przetargi')) {
      return {
        engine: 'biplubelskie',
        engineModule: '../../core/biplubelskie-bip.js',
        engineFactory: 'makeBipLubelskieCity',
        host: h,
        origin: `https://${h}`,
        menuId: 413,
        source: `https://${h}`,
      };
    }

    if (lower.includes('madkom') || lower.includes('data-ng-app="app"') || lower.includes('/api/contexts/')) {
      return {
        engine: 'madkom',
        engineModule: '../../core/madkom-bip.js',
        engineFactory: 'makeMadkomCity',
        host: h,
        origin: `https://${h}`,
        context: 'default',
        source: `https://${h}`,
      };
    }

    if (lower.includes('systemdobip') || lower.includes('e-line') || (lower.includes('/przetargi/') && lower.includes('/status/'))) {
      let boardId = 361;
      const mBoard = html.match(/\/przetargi\/(\d+)\//);
      if (mBoard) boardId = Number(mBoard[1]);
      return {
        engine: 'systemdobip',
        engineModule: '../../core/systemdobip.js',
        engineFactory: 'makeSystemDoBipCity',
        host: h,
        origin: `https://${h}`,
        boardId,
        source: `https://${h}/przetargi/${boardId}/status/0/`,
      };
    }
  }

  return null;
}

async function main() {
  const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
  const unbuilt = master.cities.filter((c) => c.status !== 'built');
  console.log(`Scanning ${unbuilt.length} unbuilt cities...`);

  let onboardedCount = 0;
  const targetBatch = Number(process.env.BATCH_SIZE) || 20;

  for (const city of unbuilt) {
    if (onboardedCount >= targetBatch) break;

    try {
      const platform = await findPlatform(city);
      if (platform) {
        console.log(`Found platform for ${city.label} (${city.id}): ${platform.engine} on ${platform.host}`);
        const ok = await onboardCity(city.id, { platform });
        if (ok) onboardedCount++;
      }
    } catch (err) {
      console.error(`Failed ${city.id}:`, err.message);
    }
  }

  console.log(`\nSuccessfully onboarded ${onboardedCount} cities in this run!`);
}

main().catch(console.error);
