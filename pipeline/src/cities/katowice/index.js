
import { config } from './config.js';
import { crawlActive as crawlActiveBip, crawlResultDocs as crawlResultDocsBip } from './crawl.js';
import {
  crawlSharePointAnnouncements,
  crawlSharePointResultDocs,
} from './crawl-sharepoint.js';
import { parseResultDoc } from './parse.js';

function pdfBasename(url) {
  const stripped = (url || '').split('?')[0];
  const idx = stripped.lastIndexOf('/');
  return decodeURIComponent(idx >= 0 ? stripped.slice(idx + 1) : stripped);
}

async function crawlActive() {
  const bip = await crawlActiveBip();
  const spResult = await crawlSharePointAnnouncements();
  const spListings = Array.isArray(spResult) ? spResult : (spResult.listings || []);
  const spLand = Array.isArray(spResult) ? [] : (spResult.land || []);

  const seen = new Set();
  const merged = [];
  for (const l of bip.listings) {
    const key = `${l.auction_date || ''}|${l.address?.key || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(l);
  }
  let spAdds = 0;
  for (const l of spListings) {
    const key = `${l.auction_date || ''}|${l.address?.key || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(l);
    spAdds++;
  }

  const landSeen = new Set();
  const land = [];
  for (const lr of [...(bip.land || []), ...spLand]) {
    const lkey = `${lr.dzialka_nr || lr.address_raw || ''}|${lr.auction_date || ''}`;
    if (lkey && landSeen.has(lkey)) continue;
    if (lkey) landSeen.add(lkey);
    land.push(lr);
  }

  console.error(
    `  katowice merged active: ${merged.length} unique (BIP ${bip.listings.length} + SP ${spListings.length} → SP added ${spAdds}); ${land.length} land record(s)`,
  );
  return { listings: merged, wykaz: bip.wykaz, land };
}

async function crawlResultDocs() {
  const bip = await crawlResultDocsBip();
  const sp = await crawlSharePointResultDocs();

  const seen = new Set();
  const refs = [];
  for (const r of bip) {
    const key = pdfBasename(r.pdf_url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(r);
  }
  let spAdds = 0;
  for (const r of sp) {
    const key = pdfBasename(r.pdf_url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(r);
    spAdds++;
  }
  console.error(
    `  katowice merged result docs: ${refs.length} unique (BIP ${bip.length} + SP ${sp.length} → SP added ${spAdds})`,
  );
  return refs;
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
