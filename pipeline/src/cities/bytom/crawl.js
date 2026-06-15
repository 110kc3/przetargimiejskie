// Bytom crawler (v2) -- primary source is the city BIP's server-rendered sales
// list; the i-BIIP catalog supplies price/area enrichment AND is the sole source
// for land (grunty niezabudowane / zabudowane) because the BIP list items for
// land carry no parseable inline data.
//
//   PRIMARY:  https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie
//   CATALOG:  https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html
//
// Why this layout (see SPIKE-WAVE2.md):
//   - The BIP list is NOT a JS SPA. It's plain server-rendered HTML, paginated
//     `?strona=N` (~10 items/page, ~4 pages), each item a
//     `<li class="aktualnosc__item">` with a publication date, a title link to
//     a real per-property page and a one-line description stating the round.
//   - BIP list/detail pages carry NO inline price or area; we still read the
//     i-BIIP catalog and join by address key to fill those fields.
//   - Bytom publishes NO achieved sale prices -- crawlResultDocs() stays [].
//
// IMPORTANT: bytom.pl serves an EMPTY body to the default bot User-Agent.
// We pass a browser-like UA for all fetches.
//
// LAND (grunty niezabudowane / zabudowane): parsed exclusively from the i-BIIP
// catalog via parseCatalogLand(). crawlActive() returns { listings, wykaz, land }
// so refresh.js partitions grunt records into data/bytom/land.json.

import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement } from './parse.js';

const BIP_BASE =
  'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie';
const CATALOG_URL =
  'https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html';

// A real browser UA -- bytom.pl gates the default bot UA to an empty body.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 10; // safety cap; real list is ~4 pages

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const digits = numStr.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(numStr.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Polish ordinal in the LIST-ITEM TITLE -> round number. Bare "przetarg"
// (no ordinal) is the first auction.
function roundFromText(txt) {
  const t = (txt || '').toLowerCase();
  if (/\bpierwsz(?!e[nn])/.test(t)) return 1;
  if (/\bdrug/.test(t)) return 2;
  if (/\btrzeci/.test(t)) return 3;
  if (/\bczwart/.test(t)) return 4;
  if (/\bpi[au]t/.test(t)) return 5;
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

// Announcement description -> property kind, or null to skip (land etc.).
function kindFromText(txt) {
  const t = (txt || '').toLowerCase();
  if (/niemieszkaln/.test(t)) return 'uzytkowy';
  if (/mieszkaln/.test(t)) return 'mieszkalny';
  return null;
}

// Joint-lot sales list TWO addresses in one title. Key on the FIRST address.
function primaryAddress(addrRaw) {
  return addrRaw.split(/\s+i\s+(?:ul|al|pl|os)\.\s+/i)[0].trim();
}

const CAT = {
  adres: /ADRES\s*:?\s*([\s\S]*?)\s*TYP\s*:/i,
  termin: /TERMIN\s+PRZETARGU\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
  cena: /CENA\s+WYWO[ŁL]AWCZA\s*:?\s*([\d .,]+)/i,
  powierzchnia: /POWIERZCHNIA\s*:?\s*([\d.,]+)/i,
};

export function parseCatalog(html) {
  const starts = [];
  const adresRe = /ADRES\s*:?/gi;
  let m;
  while ((m = adresRe.exec(html)) !== null) starts.push(m.index);

  const byKey = new Map();
  for (let i = 0; i < starts.length; i++) {
    const chunk = html.slice(starts[i], starts[i + 1] ?? html.length);
    const text = stripTags(chunk);
    const addrRaw = CAT.adres.exec(text)?.[1]?.trim();
    if (!addrRaw || /\bdz\.?\s*\d/i.test(addrRaw)) continue;
    const address = parseAddress(primaryAddress(addrRaw));
    if (!address) continue;
    const hrefM = /href="([^"]+\.doc[^"]*)"/i.exec(chunk);
    byKey.set(address.key, {
      auction_date: CAT.termin.exec(text)?.[1] ?? null,
      area_m2: parseArea(CAT.powierzchnia.exec(text)?.[1]),
      starting_price_pln: parsePLN(CAT.cena.exec(text)?.[1]),
      doc_url: hrefM ? hrefM[1].replace(/&amp;/gi, '&') : '',
    });
  }
  return byKey;
}

export function parseCatalogLand(html) {
  const land = [];
  const adresRe = /ADRES\s*:?/gi;
  const starts = [];
  let m;
  while ((m = adresRe.exec(html)) !== null) starts.push(m.index);

  for (let i = 0; i < starts.length; i++) {
    try {
      const chunk = html.slice(starts[i], starts[i + 1] ?? html.length);
      const text = stripTags(chunk);

      const addrRaw = CAT.adres.exec(text)?.[1]?.trim();
      if (!addrRaw) continue;

      // TYP field sits between "TYP :" and "ETAP"
      const typM = /TYP\s*:\s*([\s\S]*?)\s*(?:ETAP|$)/i.exec(text);
      const typ = typM?.[1]?.trim() ?? '';
      // The catalog TYP is always "grunty niezabudowane" or "grunty zabudowane".
      // classifyKind("grunty zabudowane") returns 'zabudowana' (not 'grunt'),
      // so we gate on the source word "grunt" directly instead.
      if (!/\bgrunty?\b/i.test(typ)) continue;

      // Parcel: "Alfonsa Zgrzebnioka dz. 1922/182" -> dzialka_nr = "1922/182"
      const dzM = /dz\.?\s+([\d/,\s]+)/.exec(addrRaw);
      const dzialka_nr = dzM ? dzM[1].replace(/\s+/g, '').replace(/,$/, '') : null;
      const streetRaw = dzM
        ? addrRaw.slice(0, dzM.index).replace(/[;,]+\s*$/, '').trim()
        : addrRaw.trim();

      // Round from ETAP SPRZEDAZY ("I Przetarg" -> 1, "III Przetarg" -> 3)
      const etapM = /ETAP\s+SPRZEDA[ŻZ]Y\s*:\s*([\s\S]*?)\s*(?:TERMIN|$)/i.exec(text);
      const etap = etapM?.[1]?.trim() ?? '';
      const round = (() => {
        if (/\bIV\b|czwarty/i.test(etap)) return 4;
        if (/\bIII\b|trzeci/i.test(etap)) return 3;
        if (/\bII\b|drugi/i.test(etap)) return 2;
        if (/\bV\b|pi[au]ty/i.test(etap)) return 5;
        return 1;
      })();

      const auction_date = CAT.termin.exec(text)?.[1] ?? null;
      const starting_price_pln = parsePLN(CAT.cena.exec(text)?.[1]);
      const area_m2 = parseArea(CAT.powierzchnia.exec(text)?.[1]);

      // Detail URL: BIP /idn: page or .doc announcement
      const linkHrefM = /href="([^"]+(?:\.doc|idn:\d+)[^"]*)"/i.exec(chunk);
      const detail_url = linkHrefM
        ? linkHrefM[1].replace(/&amp;/gi, '&')
        : null;

      // Geoportal link (sitplan.um.bytom.pl) supplied by the catalog itself
      const geoM = /href="(https:\/\/sitplan\.um\.bytom\.pl[^"]+)"/i.exec(chunk);
      const geoportal_url = geoM ? geoM[1].replace(/&amp;/gi, '&') : null;

      const zoning = /niezabudowan/i.test(typ) ? 'niezabudowana' : 'zabudowana';

      land.push({
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        zoning,
        address_raw: addrRaw,
        street: streetRaw || null,
        building: null,
        address: null,
        area_m2,
        starting_price_pln,
        auction_date,
        round,
        detail_url: detail_url ?? (geoportal_url ?? null),
        source_url: 'https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html',
        geoportal_url,
      });
    } catch (err) {
      console.error(`  bytom parseCatalogLand row ${i} failed: ${err.message}`);
    }
  }
  return land;
}

export function parseBipList(html) {
  const out = [];
  const itemRe = /<li[^>]*class="[^"]*aktualnosc__item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];
    const date = /class="aktualnosci__data"[^>]*>\s*(\d{4}-\d{2}-\d{2})/i.exec(li)?.[1] ?? null;
    const linkM = /<a[^>]*href="([^"]*\/idn:\d+)"[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;
    const detailUrl = linkM[1].replace(/&amp;/gi, '&');
    const addrRaw = stripTags(linkM[2]);
    const descM = /class="aktualnosci__tresc"[^>]*>([\s\S]*?)<\/p>/i.exec(li);
    const desc = stripTags(descM?.[1] || '');

    const kind = kindFromText(desc);
    if (!kind) continue;
    if (/\bdz\.?\s*\d|dzia[ll]k/i.test(addrRaw)) continue;
    const address = parseAddress(primaryAddress(addrRaw));
    if (!address) continue;

    out.push({
      address_raw: addrRaw,
      address,
      kind,
      round: roundFromText(desc),
      published_date: date,
      detail_url: detailUrl,
    });
  }
  return out;
}

async function crawlBipList() {
  const items = [];
  const seenKeys = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BIP_BASE : `${BIP_BASE}?strona=${page}`;
    let html;
    try {
      html = await getText(url, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  bytom BIP page ${page} fetch failed: ${err.message}`);
      break;
    }
    const pageItems = parseBipList(html);
    if (pageItems.length === 0) break;
    let added = 0;
    for (const it of pageItems) {
      if (seenKeys.has(it.address.key)) continue;
      seenKeys.add(it.address.key);
      items.push(it);
      added++;
    }
    console.error(`  bytom BIP page ${page}: ${pageItems.length} items (${added} new flats/commercial)`);
  }
  return items;
}

export async function crawlActive() {
  let catByKey = new Map();
  let land = [];
  try {
    const catHtml = await getText(CATALOG_URL);
    catByKey = parseCatalog(catHtml);
    land = parseCatalogLand(catHtml);
  } catch (err) {
    console.error(`  bytom i-BIIP catalog fetch failed (enrichment + land skipped): ${err.message}`);
  }

  const bip = await crawlBipList();

  const allBip = bip.map((it) => {
    const c = catByKey.get(it.address.key);
    return {
      kind: it.kind,
      address_raw: it.address_raw,
      address: it.address,
      auction_date: c?.auction_date ?? null,
      published_date: it.published_date,
      round: it.round,
      area_m2: c?.area_m2 ?? null,
      starting_price_pln: c?.starting_price_pln ?? null,
      detail_url: it.detail_url,
      doc_url: c?.doc_url ?? '',
    };
  });
  const listings = allBip;

  if (listings.length === 0 && catByKey.size > 0) {
    console.error('  bytom: BIP list empty -- falling back to i-BIIP catalog only');
    for (const [key, c] of catByKey) {
      const [street_norm] = key.split('|');
      listings.push({
        kind: 'mieszkalny',
        address_raw: street_norm,
        address: { key, street: street_norm, street_norm, building: key.split('|')[1], apt: key.split('|')[2] || null, warning: null },
        auction_date: c.auction_date,
        published_date: null,
        round: null,
        area_m2: c.area_m2,
        starting_price_pln: c.starting_price_pln,
        detail_url: CATALOG_URL,
        doc_url: c.doc_url,
      });
    }
  }

  console.error(
    `  bytom active: ${listings.length} listings (BIP ${bip.length}, catalog ${catByKey.size}); ${land.length} land plot(s)`,
  );
  return { listings, wykaz: [], land };
}

export function attachmentUrlFromDetail(html) {
  const doc = /href="([^"]+\.docx?(?:\?[^"]*)?)"/i.exec(html || '');
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html || '');
  const href = (doc && doc[1]) || (pdf && pdf[1]);
  if (!href) return null;
  const clean = href.replace(/&amp;/gi, '&');
  if (/^https?:\/\//i.test(clean)) return clean;
  try {
    return new URL(clean, 'https://www.bytom.pl/').href;
  } catch {
    return null;
  }
}

export async function enrichActive(active) {
  let recovered = 0;
  for (const l of active) {
    const hasData =
      l.starting_price_pln != null || l.area_m2 != null || l.auction_date != null;
    if (hasData) continue;

    let docUrl = l.doc_url;
    if (!docUrl && l.detail_url) {
      try {
        const html = await getText(l.detail_url, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(html);
        if (docUrl) l.doc_url = docUrl;
      } catch (err) {
        console.error(`  bytom enrich: detail fetch failed (${l.address_raw}): ${err.message}`);
      }
    }
    if (!docUrl) continue;

    try {
      const text = /\.pdf(\?|$)/i.test(docUrl)
        ? await pdfText(docUrl, { userAgent: BROWSER_UA })
        : await docText(docUrl, { userAgent: BROWSER_UA });
      const f = parseAnnouncement(text);
      if (l.auction_date == null) l.auction_date = f.auction_date;
      if (l.area_m2 == null) l.area_m2 = f.area_m2;
      if (l.starting_price_pln == null) l.starting_price_pln = f.starting_price_pln;
      if (l.round == null) l.round = f.round;
      if (f.auction_date || f.area_m2 != null || f.starting_price_pln != null) recovered++;
    } catch (err) {
      console.error(`  bytom enrich: .doc parse failed (${l.address_raw}): ${err.message}`);
    }
  }

  const before = active.length;
  for (let i = active.length - 1; i >= 0; i--) {
    const l = active[i];
    if (l.starting_price_pln == null && l.area_m2 == null && l.auction_date == null) {
      active.splice(i, 1);
    }
  }
  const dropped = before - active.length;
  console.error(
    `  bytom enrich: recovered ${recovered} from .doc, dropped ${dropped} still-empty listing(s)`,
  );
}

export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s)`);
}
