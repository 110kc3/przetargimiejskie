import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAnnouncementPost, stripTags, isFlatSaleAnnouncement } from './parse.js';

const API = 'https://belchatow.pl/wp-json/wp/v2';

const CAT_MIESZKANIA = 220;

const SEARCH_TERMS = ['mieszkanie sprzedaż', 'lokalu mieszkalnego', 'licytacja mieszkanie'];

const RESULT_TERMS = ['informacja o wyniku', 'wyniku przetargu lokal'];

const PER_PAGE = 30;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };


async function apiPosts(query) {
  const url = `${API}/posts?${query}`;
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
    if (/\bhttp\s+400\b/i.test(err.message)) return [];
    console.error(`  belchatow: REST fetch failed (${url}): ${err.message}`);
    return [];
  }
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    console.error(`  belchatow: REST returned non-JSON for ${url}`);
    return [];
  }
}

async function collectCandidates(terms, categoryId) {
  const byId = new Map();
  const add = (posts) => {
    for (const p of posts) if (p && p.id != null && !byId.has(p.id)) byId.set(p.id, p);
  };

  if (categoryId != null) {
    add(await apiPosts(`categories=${categoryId}&per_page=${PER_PAGE}&orderby=date&order=desc`));
  }
  for (const term of terms) {
    add(await apiPosts(`search=${encodeURIComponent(term)}&per_page=${PER_PAGE}&orderby=date&order=desc`));
  }
  return [...byId.values()];
}

function postToInput(p) {
  return {
    title: p?.title?.rendered ?? '',
    content: p?.content?.rendered ?? '',
    date: p?.date ?? '',
    link: p?.link ?? '',
  };
}


export async function crawlActive() {
  const candidates = await collectCandidates(SEARCH_TERMS, CAT_MIESZKANIA);
  console.error(`  belchatow crawlActive: ${candidates.length} candidate post(s)`);

  const listings = [];
  const seenKeys = new Set();
  for (const p of candidates) {
    const rec = parseAnnouncementPost(postToInput(p));
    if (!rec || !rec.address) continue;
    const k = `${rec.address.key}|${rec.auction_date ?? ''}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    listings.push(rec);
  }

  console.error(`  belchatow crawlActive: ${listings.length} flat listing(s) parsed`);
  return { listings, wykaz: [] };
}


const BIP_HOST = 'https://belchatow.bip.gov.pl';

export function bipArticleLinks(html) {
  const out = [];
  for (const m of String(html ?? '').matchAll(/href="(https?:\/\/belchatow\.bip\.gov\.pl\/ogloszenia\/[^"]+)"/gi)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

export function pickBipAttachment(html) {
  const hrefs = [...String(html ?? '').matchAll(/href="(\/fobjects\/download\/[^"]+)"/gi)].map((m) => m[1]);
  const doc = hrefs.find((h) => /-docx?\.html$/i.test(h));
  if (doc) return { url: BIP_HOST + doc, kind: 'doc' };
  const pdf = hrefs.find((h) => /-pdf\.html$/i.test(h));
  if (pdf) return { url: BIP_HOST + pdf, kind: 'pdf' };
  return null;
}

async function attachmentResultText(bipPageUrl) {
  let page;
  try {
    page = await getText(bipPageUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  belchatow: BIP article fetch failed (${bipPageUrl}): ${err.message}`);
    return null;
  }
  const att = pickBipAttachment(page);
  if (!att) return null;
  try {
    let text;
    if (att.kind === 'doc') {
      text = await docText(att.url, FETCH_OPTS);
    } else {
      text = await pdfText(att.url, FETCH_OPTS);
      if (!text || text.trim().length < 40) text = await ocrPdf(att.url, FETCH_OPTS);
    }
    if (!text || !text.trim()) return null;
    return { text, url: att.url };
  } catch (err) {
    console.error(`  belchatow: attachment extract failed (${att.url}): ${err.message}`);
    return null;
  }
}

const MAX_BIP_FOLLOWS = 6;

export async function crawlResultDocs() {
  const candidates = await collectCandidates(RESULT_TERMS, null);

  const docs = [];
  const seen = new Set();
  let follows = 0;
  for (const p of candidates) {
    const rawBody = p?.content?.rendered ?? '';
    const title = stripTags(p?.title?.rendered ?? '');
    const body = stripTags(rawBody);
    const t = `${title} ${body}`.toLowerCase();
    if (!/informacj\w*\s+o\s+wynik|cena\s+osi[ąa]gni|wynik\w*\s+negatywn/.test(t)) continue;
    if (!/lokal\w*\s+mieszkaln|mieszkani/.test(t)) continue;
    if (/dzier[żz]aw|najem|wynaj|dzia[łl]k|lokal\w*\s+u[żz]ytkow/.test(t)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    let text = body;
    let sourceUrl = p.link || null;
    const bipLink = bipArticleLinks(rawBody)[0];
    if (bipLink && follows < MAX_BIP_FOLLOWS) {
      follows += 1;
      const att = await attachmentResultText(bipLink);
      if (att) {
        text = att.text;
        sourceUrl = att.url;
      }
    }
    docs.push({ text, auction_date: (p.date || '').slice(0, 10) || null, pdf_url: sourceUrl });
  }

  console.error(`  belchatow crawlResultDocs: ${docs.length} result doc(s)`);
  return docs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
