import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseNotice, extractAreaM2, extractTextContent } from './parse.js';

const BOARD_URL = 'https://gzmk.pl/bw/Przetargi_na_sprzedaz_nieruchomosci,14';

const MAX_NOTICES = 80;

const SKIP_LINK_RE = /lista\s+os[óo]b\s+zakwalifikowanych|dzier[żz]aw|najem/i;

const NOTICE_LINK_RE = /href="([^"]*,14,(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;

function stripLinkText(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function discoverCandidateUrls() {
  const html = await getText(BOARD_URL);
  const out = [];
  const seen = new Set();
  let m;
  while ((m = NOTICE_LINK_RE.exec(html)) !== null) {
    const id = Number(m[2]);
    if (seen.has(id)) continue;
    seen.add(id);
    const linkText = stripLinkText(m[3]);
    if (SKIP_LINK_RE.test(linkText)) continue;
    const url = new URL(m[1], BOARD_URL).toString();
    out.push({ id, url, linkText });
  }
  out.sort((a, b) => b.id - a.id);
  const bounded = out.slice(0, MAX_NOTICES);
  console.error(
    `  strzelce-opolskie: board ${out.length} sale notice(s) (bounded to ${bounded.length})`,
  );
  return bounded;
}

function extractPdfUrl(html, baseUrl) {
  const m = /href="([^"]*download\.php\?[^"]*)"/i.exec(html || '');
  if (!m) return null;
  const href = m[1].replace(/&amp;/gi, '&');
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;
  const candidates = await discoverCandidateUrls();
  const records = [];
  for (const c of candidates) {
    let html;
    try {
      html = await getText(c.url);
    } catch (err) {
      console.error(`  strzelce-opolskie fetch failed (${c.url}): ${err.message}`);
      continue;
    }
    const rec = parseNotice(html, c.url);

    if ((rec.kind === 'mieszkalny' || rec.kind === 'uzytkowy') && rec.area_m2 == null) {
      const pdfUrl = extractPdfUrl(html, c.url);
      if (pdfUrl) {
        try {
          const text = await pdfText(pdfUrl);
          const area = extractAreaM2(text, rec.kind);
          if (area != null) rec.area_m2 = area;
        } catch (err) {
          console.error(`  strzelce-opolskie flat-area PDF fallback failed (${pdfUrl}): ${err.message}`);
        }
      }
    }

    if (!rec.address && !rec.dzialka_nr) {
      console.error(`  strzelce-opolskie no subject (kind=${rec.kind}): ${c.url}`);
      continue;
    }
    records.push({ ...rec, html });
  }
  console.error(`  strzelce-opolskie: ${records.length} notice(s) parsed from ${candidates.length} candidate(s)`);
  _cache = records;
  return records;
}


export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();

  const listings = [];
  for (const r of records) {
    if (!r.auction_date || r.auction_date < todayIso) continue;
    listings.push({
      kind: r.kind,
      address_raw: r.address_raw,
      address: r.address,
      dzialka_nr: r.dzialka_nr,
      obreb: r.obreb,
      area_m2: r.area_m2,
      starting_price_pln: r.starting_price_pln,
      auction_date: r.auction_date,
      round: r.round,
      detail_url: r.detail_url,
      published_date: r.published_date,
    });
  }
  console.error(`  strzelce-opolskie active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.status !== 'rozstrzygniety') continue;
    refs.push({ text: r.html, pdf_url: r.detail_url, auction_date: r.auction_date });
  }
  console.error(`  strzelce-opolskie crawlResultDocs: ${refs.length} resolved notice(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
