import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import { getText } from '../../pipeline/src/core/fetch.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const master = JSON.parse(readFileSync(`${ROOT}/spikes/master-cities.json`, 'utf8'));

const targets = master.cities.filter(c => c.status === 'no-build' || c.status === 'dropped' || c.status === 'deferred');
console.log(`Starting audit scan over ${targets.length} non-built cities...`);

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probeCity(city) {
  const cleanSlug = city.id.replace(/-/g, '');
  const baseSlug = city.id.replace(/-\d+$/, '').replace(/-/g, '');

  const candidateHosts = [
    city.seller?.source_host,
    `bip.${city.id}.pl`,
    `bip.um.${city.id}.pl`,
    `bip.umig.${city.id}.pl`,
    `bip.${cleanSlug}.pl`,
    `bip.um${cleanSlug}.pl`,
    `bip.umig${cleanSlug}.pl`,
    `${city.id}.bip.net.pl`,
    `${cleanSlug}.bip.net.pl`,
    `bip.${cleanSlug}.rekord.com.pl`,
    `bip2.um${cleanSlug}.rekord.com.pl`,
  ].filter(Boolean);

  for (const host of candidateHosts) {
    const resolves = await dns.lookup(host).catch(() => null);
    if (!resolves) continue;

    try {
      const html = await getText(`https://${host}`, { userAgent: BROWSER_UA, timeoutMs: 2500, retries: 0 });
      if (!html) continue;

      const lower = html.toLowerCase();

      if (lower.includes('madkom') || html.includes('/api/contexts/')) {
        return { city: city.id, host, engine: 'madkom' };
      }
      try {
        const testCtx = await getText(`https://${host}/api/contexts/default`, { timeoutMs: 1200, retries: 0 });
        if (testCtx && testCtx.includes('"availableLanguages"')) {
          return { city: city.id, host, engine: 'madkom' };
        }
      } catch (e) {}

      if (lower.includes('rekord') || html.includes('api/download/file') || html.includes('/dokument/')) {
        return { city: city.id, host, engine: 'rekordsi' };
      }

      if (lower.includes('logonet') || html.includes('/przetargi-nieruchomosci/')) {
        return { city: city.id, host, engine: 'logonet' };
      }

      if (host.includes('bip.net.pl') || html.includes('bip.net.pl') || html.includes('/kategorie/')) {
        const m = html.match(/href="([^"]*(?:przetarg|zbycie|nieruchom)[^"]*)"/i);
        if (m) {
          return { city: city.id, host, engine: 'bipnetpl', sample: m[1] };
        }
      }

      const auctionMatch = html.match(/href="([^"]*(?:przetargi-nieruchomosci|przetarg-nieruchomosci|sprzedaz-nieruchomosci)[^"]*)"/i);
      if (auctionMatch) {
        return { city: city.id, host, engine: 'custom-auction', link: auctionMatch[1] };
      }

    } catch (e) {}
  }

  return null;
}

const concurrency = 12;
const results = [];
for (let i = 0; i < targets.length; i += concurrency) {
  const chunk = targets.slice(i, i + concurrency);
  const chunkResults = await Promise.all(chunk.map(c => probeCity(c)));
  for (const r of chunkResults) {
    if (r) {
      console.log(`[DISCOVERY] ${r.city} -> ${r.engine} on ${r.host} ${r.sample || r.link || ''}`);
      results.push(r);
    }
  }
}

console.log(`\nAudit complete! Found ${results.length} candidate engines among ${targets.length} cities.`);
