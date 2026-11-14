
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';

const LIST_URL = 'https://bip.gliwice.eu/ogloszenia-i-komunikaty?stronicowanie=50';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, 'października': 10, listopada: 11, grudnia: 12,
};
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const NAMED = {
  oacute: 'ó', Oacute: 'Ó', aacute: 'á', ndash: '–', mdash: '—',
  rdquo: '”', ldquo: '„', bdquo: '„', rsquo: '’', lsquo: '‘',
  nbsp: ' ', amp: '&', quot: '"', laquo: '«', raquo: '»',
};

export function stripBip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&sup3;/g, '³')
    .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] != null ? NAMED[n] : ' '))
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(+d); } catch { return ' '; } })
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function iso(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function resolveDate(text, url, title) {
  const hay = `${title || ''} ${url} ${text.slice(0, 400)}`;
  let m =
    /przetarg[\s\-]*?(\d{1,2})[.\-](\d{1,2})[.\-](20\d{2})/i.exec(hay) ||
    /przetarg-(\d{2})(\d{2})(20\d{2})/i.exec(url);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /rozpocznie się\s+(\d{1,2})\s+([a-zżźćńółęąś]+)\s+(20\d{2})\s*r/i.exec(text);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[1], MONTHS[m[2].toLowerCase()], +m[3]);
  m = /(\d{1,2})\s+([a-zżźćńółęąś]+)\s+(20\d{2})\s*r\.[\s\S]{0,160}?odbęd[ąa]\s+się/i.exec(text);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[1], MONTHS[m[2].toLowerCase()], +m[3]);
  return null;
}

function blockFigures(seg) {
  const a =
    /(?:POWIERZCHNIA LOKALU:|POWIERZCHNIA GARAŻU:|o powierzchni(?: użytkowej)?)\s*(\d+(?:[,]\d+)?)\s*m\s?[²2]/i.exec(seg);
  const p =
    /CENA WYWOŁAWCZA[^:\n]*:\s*([\d  .]+?)(?:,\d{2})?\s*z[łl]/i.exec(seg) ||
    /cena wywoławcza[^:\n]*:\s*([\d  .]+?)(?:,\d{2})?\s*z[łl]/i.exec(seg);
  return {
    area_m2: a ? Number(a[1].replace(',', '.')) : null,
    starting_price_pln: p ? Number(p[1].replace(/[  .]/g, '')) : null,
  };
}

function makeListing(addressRaw, kind, date, round, figures, url, ownerType = null) {
  return {
    kind,
    address_raw: addressRaw,
    address: parseAddress(addressRaw),
    auction_date: date,
    area_m2: figures.area_m2,
    starting_price_pln: figures.starting_price_pln,
    round: round ?? null,
    detail_url: url,
    source: 'bip', // provenance marker; harmless extra field on the listing.
    ...(ownerType ? { owner_type: ownerType } : {}),
  };
}

function ownerTypeFrom(text, title, url) {
  const haystack = `${title || ''} ${url || ''} ${text || ''}`;
  return /w[łl]asno[śs][ćc]\s+skarbu\s+pa[ńn]stwa/i.test(haystack)
    ? 'state_treasury'
    : null;
}

function isDzialkaDoc(text, title) {
  return (
    /sprzeda[zż]\s*[–-]\s*(?:dzia[łl]k[ai]\b|dz\.)/i.test(title || '') ||
    /obejmuj[ąa]c\w*\s+(?:nie)?zabudowan\w*\s+dzia[łl]k/i.test(text)
  );
}

function normalizeParcels(s) {
  return (s || '').replace(/\s+i\s+(?:nr\s+)?/gi, ', ').replace(/\s+/g, ' ').trim();
}

function parseBipLandDoc(text, date, url, title) {
  const tm =
    /sprzeda[zż]\s*[–-]\s*(?:dzia[łl]k[ai]|dz\.)\s*(?:nr\s*)?(.+?),\s*obr[eę]b\s+(.+?),\s*(.+?)\s*[–-]\s*BIP/i.exec(title || '');
  const bm =
    /(?:nie)?zabudowan\w*\s+dzia[łl]k[ęi]\s+(?:nr\s+)?([\d/]+(?:\s+i\s+(?:nr\s+)?[\d/]+)*)(?:,\s*obr[eę]b\s+([^,.(]+?))?(?=[,.(]|\s+o\s+pow|\s+po[łl]o)/i.exec(text);

  const dzialka_nr = normalizeParcels(tm ? tm[1] : bm ? bm[1] : '') || null;
  if (!dzialka_nr) return [];
  const obreb =
    (tm && tm[2] ? tm[2] : bm && bm[2] ? bm[2] : '').replace(/\s+/g, ' ').trim() || null;
  const address_raw = tm && tm[3] ? tm[3].replace(/\s+/g, ' ').trim() : null;

  const rm = /([IVX]+)\s+ustny przetarg/i.exec(text);
  return [{
    kind: 'grunt',
    dzialka_nr,
    obreb,
    address_raw,
    auction_date: date,
    starting_price_pln: blockFigures(text).starting_price_pln,
    round: rm ? ROMAN[rm[1]] || null : null,
    detail_url: url,
    source: 'bip',
  }];
}

export function parseBipSaleDoc(html, url, title) {
  const text = stripBip(html);
  const date = resolveDate(text, url, title);
  const ownerType = ownerTypeFrom(text, title, url);

  if (isDzialkaDoc(text, title)) return parseBipLandDoc(text, date, url, title);

  const openRe =
    /([IVX]+)\s+ustny przetarg[^.]*?na (?:sprzedaż|zbycie prawa własności)\s+(lokalu mieszkalnego|lokalu użytkowego|garażu)\s+nr\s+([0-9]+[a-zA-Z]?)\s+(?:usytuowanego[^,]*?)?przy\s+(?:[Uu][Ll]|[Aa][Ll]|[Pp][Ll]|[Oo][Ss])\.\s+([A-ZŁŚŻŹĆĄĘÓŃ][A-ZŁŚŻŹĆĄĘÓŃa-ząćęłńóśźż.\- ]+?)\s+(\d+[A-Za-z]?)(?=[\s,.])/g;
  const hits = [];
  let m;
  while ((m = openRe.exec(text)) !== null) hits.push({ m, start: m.index });

  const out = [];
  for (let i = 0; i < hits.length; i++) {
    const mm = hits[i].m;
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    const seg = text.slice(hits[i].start, end);
    const kindWord = mm[2];
    const lokNr = mm[3];
    const street = mm[4].trim().replace(/\s+/g, ' ');
    const bldg = mm[5];
    const kind = kindWord.includes('mieszkalnego')
      ? 'mieszkalny'
      : kindWord.includes('użytkowego')
        ? 'uzytkowy'
        : 'garaz';
    const addrRaw =
      kind === 'garaz' ? `${street} ${bldg} garaż nr ${lokNr}` : `${street} ${bldg}/${lokNr}`;
    const lst = makeListing(addrRaw, kind, date, ROMAN[mm[1]] || null, blockFigures(seg), url, ownerType);
    if (lst.address) out.push(lst);
  }
  if (out.length) return out;

  const tm =
    /lokal[u]?\s+(mieszkaln\w+|użytkow\w+)\s+(?:przy\s+)?(?:ul|al|pl|os)\.\s+([A-ZŁŚŻŹĆĄĘÓŃ][\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ.\- ]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(title || '');
  if (tm) {
    const kind = /mieszkaln/i.test(tm[1]) ? 'mieszkalny' : 'uzytkowy';
    const rm = /([IVX]+)\s+ustny przetarg/i.exec(text);
    const figures = blockFigures(text);
    const lst = makeListing(
      tm[2].replace(/\s+/g, ' ').trim(), kind, date, rm ? ROMAN[rm[1]] || null : null, figures, url,
      ownerType,
    );
    if (lst.address && lst.starting_price_pln != null) return [lst];
  }
  return [];
}

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const SPRZEDAZ_HREF_RE = /href="(https?:\/\/bip\.gliwice\.eu\/sprzedaz-[a-z0-9-]+)"/gi;

export async function crawlBipSales() {
  const listHtml = await getText(LIST_URL, { userAgent: UA });
  const urls = new Set();
  let m;
  SPRZEDAZ_HREF_RE.lastIndex = 0;
  while ((m = SPRZEDAZ_HREF_RE.exec(listHtml)) !== null) urls.add(m[1]);

  const listings = [];
  const land = [];
  let lokalePages = 0;
  let landPages = 0;
  for (const url of urls) {
    let html;
    try {
      html = await getText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  BIP: fetch failed ${url}: ${err.message}`);
      continue;
    }
    const title = (TITLE_RE.exec(html) || [, ''])[1].replace(/\s+/g, ' ').trim();
    const recs = parseBipSaleDoc(html, url, title);
    const grunt = recs.filter((r) => r.kind === 'grunt');
    const lokale = recs.filter((r) => r.kind !== 'grunt');
    if (grunt.length) landPages++;
    else if (lokale.length) lokalePages++;
    listings.push(...lokale);
    land.push(...grunt);
  }
  console.error(
    `  BIP (bip.gliwice.eu): ${urls.size} sprzedaż pages, ${lokalePages} with lokale, ` +
      `${landPages} działka → ${listings.length} listings + ${land.length} land`,
  );
  return { listings, land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlBipSales();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} BIP lokale + ${land.length} BIP land record(s)`);
}


const STREET_SUFFIX_SUBS = [
  ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
  ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
];
function streetVariants(street) {
  const out = new Set([street]);
  for (const [re, repl] of STREET_SUFFIX_SUBS) {
    const v = street.replace(new RegExp(re), repl);
    if (v !== street) out.add(v);
  }
  const w = street.split(' ').filter(Boolean);
  if (w.length > 1) {
    out.add(w[w.length - 1]);
    if (w.length > 2) out.add(w.slice(-2).join(' '));
  }
  return out;
}

export function foldBipDuplicates(listings) {
  const out = [];
  for (const l of listings) {
    if (l.source !== 'bip' || !l.address) {
      out.push(l);
      continue;
    }
    const vars = streetVariants(l.address.street_norm);
    const twin = out.find(
      (o) =>
        o.source !== 'bip' &&
        o.address &&
        o.auction_date === l.auction_date &&
        o.address.building === l.address.building &&
        (o.address.apt ?? '') === (l.address.apt ?? '') &&
        vars.has(o.address.street_norm),
    );
    if (twin) {
      if (l.detail_url && !twin.bip_url) twin.bip_url = l.detail_url;
      if (l.round != null) {
        twin.round = l.round;
        twin.round_source = 'explicit';
      }
      if (l.owner_type && !twin.owner_type) twin.owner_type = l.owner_type;
      continue;
    }
    out.push(l);
  }
  return out;
}
