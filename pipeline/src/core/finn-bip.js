import { getText } from './fetch.js';
import { parseAddress } from './normalize.js';
import { classifyKind } from './classify-kind.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEFAULT_LINK_PATTERN = /\/artykul\/(?:ogloszenie|obwieszczenie|wykaz)/i;

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
  styczeń: 1, styczen: 1, luty: 2, marzec: 3, kwiecień: 4, kwiecien: 4, maj: 5,
  czerwiec: 6, lipiec: 7, sierpień: 8, sierpien: 8, wrzesień: 9, wrzesien: 9,
  październik: 10, pazdziernik: 10, listopad: 11, grudzień: 12, grudzien: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_RE_SRC = '(VIII|VII|VI|IX|IV|V|X|I{1,3})';

export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h\d|\/span|\/strong|\/b)\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  const named = { amp: '&', sup2: '²', sup3: '³', nbsp: ' ', lt: '<', gt: '>', quot: '"', oacute: 'ó' };
  s = s.replace(/&(#x[0-9a-f]+|#\d+|amp|sup2|sup3|nbsp|lt|gt|quot|oacute);/gi, (entity, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()];
    const hex = code[1].toLowerCase() === 'x';
    const point = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : '\uFFFD';
  });
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function isSaleAuction(title) {
  const t = (title || '').toLowerCase();
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
    return false;
  }
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return true;
}

export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
}

export function resolveKind(title, bodyText) {
  const fromTitle = classifyKind(title);
  if (fromTitle !== 'unknown') return fromTitle;
  return classifyKind(`${title} ${bodyText || ''}`);
}

export function roundFromTitle(title) {
  const t = title || '';
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  if (/pi[ąa]t(?!ek\b|k)/i.test(t)) return 5;
  const r =
    new RegExp(`\\b[oO]\\s+${ROMAN_RE_SRC}\\s+(?:[Uu]stnym\\s+|USTNYM\\s+)?(?:[Pp]rzetarg|PRZETARG)`).exec(t) ||
    new RegExp(`\\b${ROMAN_RE_SRC}\\s+(?:[Pp]rzetarg|PRZETARG)`).exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

export function roundFromText(text) {
  const m = /og[łl]asza\s+([\s\S]{0,60}?)przetarg/i.exec(text || '');
  const scope = m ? m[1] : '';
  if (/pierwsz/i.test(scope)) return 1;
  if (/drug/i.test(scope)) return 2;
  if (/trzeci/i.test(scope)) return 3;
  if (/czwart/i.test(scope)) return 4;
  const ms = [...scope.matchAll(new RegExp(`\\b${ROMAN_RE_SRC}\\b`, 'g'))];
  if (ms.length) return ROMAN[ms[ms.length - 1][1]] ?? null;
  return /og[łl]asza/i.test(text || '') ? 1 : null;
}

export function parsePLN(s) {
  if (!s) return null;
  let c = String(s).replace(/[\s ]/g, '');
  c = c.replace(/z[łl].*$/i, '');
  c = c.replace(/,-+$/, '').replace(/,\d{1,2}$/, '');
  c = c.replace(/[^\d]/g, '');
  return c ? Number(c) : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function priceFromText(text) {
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,140}?([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function shareFromTitle(title, text = '') {
  const m = /udzia[łl]\w*(?:\s+\S+){0,3}?\s+(\d{1,3}\/\d{1,3})\s+cz[ęe][śs]/i.exec(`${title} ${text}`);
  return m ? m[1] : null;
}

export function areaFromText(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const plausibleLab = (v) => v != null && v >= 8;
  const LAB_EXCLUDE = /piwnic|kom[óo]rk|przynale[żz]|gara[żz]|strych|dzia[łl]k|grunt/i;
  const LAB = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*([^0-9]{0,40}?)([\d.,]+)\s*m\s*[²2]/gi;
  let lm;
  while ((lm = LAB.exec(text)) !== null) {
    const before = text.slice(Math.max(0, lm.index - 30), lm.index);
    if (LAB_EXCLUDE.test(before) || LAB_EXCLUDE.test(lm[1])) continue;
    const v = parseArea(lm[2]);
    if (plausibleLab(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b|[łl][ąa]cznej|udzia[łl]/i.test(before)) continue;
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]|strych/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (/u[żz]ytkow/i.test(before)) {
      if (plausibleLab(v)) return v;
      continue;
    }
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const spelled = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const numAnchored = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numAnchored) {
    return `${numAnchored[3]}-${numAnchored[2].padStart(2, '0')}-${numAnchored[1].padStart(2, '0')}`;
  }
  const anySpelled = /w\s+dniu\s+(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/i.exec(text);
  if (anySpelled) {
    const mon = PL_MONTHS[anySpelled[2].toLowerCase()];
    if (mon) return `${anySpelled[3]}-${String(mon).padStart(2, '0')}-${anySpelled[1].padStart(2, '0')}`;
  }
  const num = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt =
    /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;

  const b =
    /budynku\s+(?:nr\.?\s*)?(\d+[A-Za-z]?)\s+przy\s+(?:ul\.|ulicy|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s+w\s+[A-ZŻŹĆŁŚ]|\s+w\s+dzielnic|\s+wraz|\s+o\s+pow|[,.;]|$)/i.exec(src);
  if (b && !/^[A-ZŻŹĆŁŚĄĘÓŃ]/.test(b[2])) b[2] = null;
  if (b && b[2]) {
    const building = b[1].toUpperCase();
    const street = b[2].replace(/\s+/g, ' ').trim();
    const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }

  const aRe =
    /przy\s+(?:ul\.|ulicy|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/;
  const a = aRe.exec(title) || aRe.exec(src);
  if (a) {
    const street = a[1].replace(/\s+/g, ' ').trim();
    let buildingApt = a[2];
    if (!/\//.test(buildingApt) && apt) buildingApt = `${buildingApt}/${apt}`;
    const raw = `${street} ${buildingApt}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  return null;
}

export function parseAnnouncement(title, contentHtml) {
  const text = htmlToText(contentHtml);
  const addr = addressFrom(title, text);
  if (!addr) return null;
  const kind = classifyKind(title);
  return {
    kind: kind === 'mieszkalny' || kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromTitle(title) ?? roundFromText(text),
    auction_date: auctionDateFromText(text),
    share: shareFromTitle(title, text),
  };
}

export function parseLandAnnouncement(title, contentHtml, url) {
  const rawText = htmlToText(contentHtml);
  let text = rawText.replace(/(\d)\s+\./g, '$1.').replace(/\.\s+(\d)/g, '.$1');
  text = text.replace(/\b(20[23])\s+(\d)\b/g, '$1$2');
  text = text.replace(
    /\b(\d)\s+(\d)\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrzesnia|wrze[śs]nia|pa[źz]dziernika|pa[źz]dziernik|listopada|grudnia|stycze[ńn]|luty|marzec|kwiecie[ńn]|czerwiec|lipiec|sierpie[ńn]|wrzesie[ńn]|listopad|grudzie[ńn])/gi,
    '$1$2 $3',
  );

  const parcelM = /dzia[łl][ek]{1,2}\w*\s+(?:nr\.?|numer)?\s*([\d/][\d/,\s]+)/i.exec(text);
  let dzialka_nr = null;
  if (parcelM) {
    const run = parcelM[1].slice(0, 80);
    const parcels = [...run.matchAll(/(\d+\/?\d*)/g)].map((m) => m[1]);
    const clean = parcels.filter((p) => /^\d+(?:\/\d+)?$/.test(p));
    if (clean.length) dzialka_nr = clean.join(', ');
  }

  const obrebM = /obr[eę]b[u]?\s+(?:nr\.?\s*)?(\d{4}(?:\s+\S+)?|[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ\s-]{1,40})/i.exec(text);
  const obreb = obrebM ? obrebM[1].replace(/\s+/g, ' ').trim().replace(/\s*,.*$/, '') : null;

  let area_m2 = null;
  const AREA_RE = /(?:(?:[łl]ącznej\s+)?pow(?:ierzchni)?\.?\s*|powierzchni[a]?\s+)([\d.,\s]+)\s*m\s*(?:[²2]|kw|["”])/gi;
  let am;
  while ((am = AREA_RE.exec(text)) !== null) {
    const before = text.slice(Math.max(0, am.index - 40), am.index);
    if (/u[żz]ytkow/i.test(before) || /u[żz]ytkow/i.test(am[0])) continue;
    const raw = am[1].replace(/\s/g, '');
    const n = Number(raw.replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1e7) {
      if (area_m2 == null || n > area_m2) area_m2 = n;
    }
  }
  if (area_m2 == null) {
    const haM = /([\d][\d.,\s]*)\s*ha\b/i.exec(text);
    if (haM) {
      const n = Number(haM[1].replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0 && n < 1e4) area_m2 = Math.round(n * 10000);
    }
  }

  let street = null;
  let address_raw = null;
  let address = null;
  const streetM = /(?:przy|w\s+rejonie|po[łl]o[żz]onej?\s+(?:przy\s+)?(?:ul\.|ulicy)?)\s+(?:ul\.|ulicy|al\.|alei)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-Z]|\s+obejmują|\s+(?:o\s+)?(?:łączn|powierzchn|pow\b)|\s+na\s+arkusz|$)/i.exec(text);
  if (streetM) {
    street = streetM[1].replace(/\s+/g, ' ').trim();
    street = street.replace(/\s+i\s+ul\b.*$/i, '').trim();
    const PROSE =
      /\b(będą|miały|mają|zastosowanie|przepis|nieruchomoś|nabywani|sprzeda|oraz|które[jmn]?|stanowiąc|zgodnie|obejmuj|wynosi|posiada)\b/i;
    if (street.length > 38 || PROSE.test(street) || /^ul\.?$/i.test(street)) {
      street = null;
    } else {
      address_raw = 'ul. ' + street;
      address = parseAddress(address_raw) || null;
    }
  }

  if (!dzialka_nr && !street) return null;

  return {
    kind: 'grunt',
    dzialka_nr,
    obreb,
    zoning: null,
    address_raw: address_raw ?? null,
    street,
    building: null,
    address,
    area_m2,
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromTitle(title) ?? roundFromText(text),
    detail_url: url,
    source_url: url,
    geoportal_url: null,
  };
}


export function parseIndexLinks(html, origin, pattern = DEFAULT_LINK_PATTERN) {
  const out = [];
  const seen = new Set();
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!pattern.test(href)) continue;
    if (!/^https?:/i.test(href)) href = origin + (href.startsWith('/') ? '' : '/') + href;
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

export function extractArticle(html, fallbackTitle = '') {
  const h = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  const title = (h ? htmlToText(h[1]) : '') || fallbackTitle;
  return { title, body: html };
}

export function makeCrawlActive(cfg) {
  const {
    origin, indexUrls, id,
    linkPattern = DEFAULT_LINK_PATTERN,
    linkFilter = null,
    isFlat = isFlatAuction,
  } = cfg;
  const FETCH_OPTS = { userAgent: BROWSER_UA };

  return async function crawlActive() {
    const urls = [];
    const seen = new Set();
    for (const idx of indexUrls) {
      let html;
      try {
        html = await getText(idx, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} index fetch failed (${idx}): ${err.message}`);
        continue;
      }
      const links = parseIndexLinks(html, origin, linkPattern).filter(
        (u) => !linkFilter || linkFilter.test(u),
      );
      let added = 0;
      for (const u of links) {
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        added++;
      }
      console.error(`  ${id} index ${idx}: ${links.length} announcement link(s) (${added} new)`);
    }
    console.error(`  ${id}: ${urls.length} candidate announcement(s) to inspect`);

    const listings = [];
    const land = [];
    let flats = 0;
    let others = 0;
    let plots = 0;
    for (const url of urls) {
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} article fetch failed (${url}): ${err.message}`);
        continue;
      }
      let title, body;
      try {
        ({ title, body } = extractArticle(html));
      } catch (err) {
        console.error(`  ${id} article extract failed (${url}): ${err.message}`);
        continue;
      }

      const kind = resolveKind(title, htmlToText(body));

      if (kind === 'grunt') {
        try {
          const lr = parseLandAnnouncement(title, body, url);
          if (lr) { land.push(lr); plots++; }
          else console.error(`  ${id} WARN: unkeyable land ${url} (${title.slice(0, 70)})`);
        } catch (err) {
          console.error(`  ${id} land parse failed (${url}): ${err.message}`);
        }
        continue;
      }

      if (kind === 'zabudowana' || kind === 'uzytkowy') {
        if (!isSaleAuction(title)) continue;
        try {
          const parsed = parseAnnouncement(title, body);
          if (!parsed) {
            console.error(`  ${id} WARN: unkeyable ${kind} ${url} (${title.slice(0, 70)})`);
            continue;
          }
          others++;
          listings.push({
            kind,
            address_raw: parsed.address_raw,
            address: parsed.address,
            auction_date: parsed.auction_date,
            published_date: null,
            round: parsed.round,
            area_m2: parsed.area_m2,
            starting_price_pln: parsed.starting_price_pln,
            detail_url: url,
            share: parsed.share,
          });
        } catch (err) {
          console.error(`  ${id} ${kind} parse failed (${url}): ${err.message}`);
        }
        continue;
      }

      if (!isFlat(title)) continue;
      flats++;
      try {
        const parsed = parseAnnouncement(title, body);
        if (!parsed) {
          console.error(`  ${id} WARN: unkeyable flat ${url} (${title.slice(0, 70)})`);
          continue;
        }
        listings.push({
          kind: parsed.kind,
          address_raw: parsed.address_raw,
          address: parsed.address,
          auction_date: parsed.auction_date,
          published_date: null,
          round: parsed.round,
          area_m2: parsed.area_m2,
          starting_price_pln: parsed.starting_price_pln,
          detail_url: url,
          share: parsed.share,
        });
      } catch (err) {
        console.error(`  ${id} flat parse failed (${url}): ${err.message}`);
      }
    }
    console.error(
      `  ${id} active: ${listings.length} listing(s) (${flats} flat + ${others} house/commercial); ${plots} land plot(s)`,
    );
    return { listings, wykaz: [], land };
  };
}

export async function crawlResultDocs() {
  return [];
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}

export function makeFinnCity(options) {
  const origin = (options.origin || (options.host ? `https://${options.host}` : '')).replace(/\/$/, '');
  const boardUrl = options.boardUrl || (options.indexUrls ? options.indexUrls[0] : `${origin}/artykul/przetargi`);
  const crawlActive = makeCrawlActive({
    id: options.id,
    origin,
    indexUrls: options.indexUrls || [boardUrl],
  });

  return {
    id: options.id,
    teryt: options.teryt,
    label: options.label,
    voivodeship: options.voivodeship,
    authority: options.authority || `Burmistrz Miasta ${options.label}`,
    host: options.host || (origin ? new URL(origin).host : ''),
    source: boardUrl,
    contact: options.contact || `bip@${options.id}.pl`,
    crawlActive,
    crawlResults: crawlResultDocs,
  };
}
