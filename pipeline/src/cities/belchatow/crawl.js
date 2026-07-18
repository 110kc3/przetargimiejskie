// Bełchatów crawler.
//
// Reads belchatow.pl through the WordPress REST API (belchatow.pl/wp-json/wp/v2),
// which returns clean JSON and sidesteps the tagDiv theme's AJAX-hydrated
// category loop (that loop renders "Brak postów" server-side when idle). See
// config.js for the channel map (formal stubs in cat 220/221 vs. parseable
// prose in the news category 215).
//
// crawlActive():
//   Collects candidate posts from the dedicated flat category (220 "mieszkania")
//   plus a handful of REST full-text searches, dedupes by post id, keeps only
//   genuine flat-SALE announcements (isFlatSaleAnnouncement — must quote a
//   "cena wywoławcza"), and parses each prose body. Returns { listings, wykaz:[] }.
//
// crawlResultDocs():
//   Searches the same site for "informacja o wyniku …" flat result posts. The
//   belchatow.pl posts are STUBS (property description only) — the achieved
//   price + sold/unsold outcome live in an attachment on the linked
//   belchatow.bip.gov.pl article (/fobjects/download/<id>/…-doc.html|-pdf.html),
//   so each kept stub is followed to its BIP article and the attachment text
//   (docText for the "dostępna cyfrowo" .doc, pdfText→ocrPdf for the PDF)
//   replaces the stub body. Falls back to the stub body when no attachment
//   yields text — parse.js already skips price-less stubs, so nothing wrong
//   lands either way.
//
// Volume: ~1–2 municipal flat auctions/year — low-frequency polling.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAnnouncementPost, stripTags, isFlatSaleAnnouncement } from './parse.js';

const API = 'https://belchatow.pl/wp-json/wp/v2';

// Dedicated flat subcategory ("Mieszkania", child of "Przetargi").
const CAT_MIESZKANIA = 220;

// Full-text search terms that surface flat-sale announcements (the news prose
// posts live in the large "Aktualności" category, not under przetargi).
const SEARCH_TERMS = ['mieszkanie sprzedaż', 'lokalu mieszkalnego', 'licytacja mieszkanie'];

// Result-notice search terms.
const RESULT_TERMS = ['informacja o wyniku', 'wyniku przetargu lokal'];

const PER_PAGE = 30;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

async function apiPosts(query) {
  const url = `${API}/posts?${query}`;
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
    // WordPress returns HTTP 400 for an empty search / unknown category rather
    // than an empty array — treat as "no posts", not a hard failure.
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

// Collect posts from a category + several searches, deduped by id.
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

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const candidates = await collectCandidates(SEARCH_TERMS, CAT_MIESZKANIA);
  console.error(`  belchatow crawlActive: ${candidates.length} candidate post(s)`);

  const listings = [];
  const seenKeys = new Set();
  for (const p of candidates) {
    const rec = parseAnnouncementPost(postToInput(p));
    if (!rec || !rec.address) continue;
    // Dedupe by address key + auction date (news + formal stub of same auction).
    const k = `${rec.address.key}|${rec.auction_date ?? ''}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    listings.push(rec);
  }

  console.error(`  belchatow crawlActive: ${listings.length} flat listing(s) parsed`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

const BIP_HOST = 'https://belchatow.bip.gov.pl';

// BIP article links inside a stub's raw rendered HTML.
export function bipArticleLinks(html) {
  const out = [];
  for (const m of String(html ?? '').matchAll(/href="(https?:\/\/belchatow\.bip\.gov\.pl\/ogloszenia\/[^"]+)"/gi)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

// Pick the best /fobjects/download/ attachment from a BIP article page.
// Prefers the "dostępna cyfrowo" .doc/.docx (born-digital text) over the PDF
// (often a scan needing OCR). Returns { url, kind: 'doc'|'pdf' } or null.
export function pickBipAttachment(html) {
  const hrefs = [...String(html ?? '').matchAll(/href="(\/fobjects\/download\/[^"]+)"/gi)].map((m) => m[1]);
  const doc = hrefs.find((h) => /-docx?\.html$/i.test(h));
  if (doc) return { url: BIP_HOST + doc, kind: 'doc' };
  const pdf = hrefs.find((h) => /-pdf\.html$/i.test(h));
  if (pdf) return { url: BIP_HOST + pdf, kind: 'pdf' };
  return null;
}

// Follow a stub's BIP article and extract its attachment text. Returns
// { text, url } or null; every failure degrades gracefully to the stub body.
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

// Politeness cap on BIP article follows per run (volume is ~1–2 results/yr;
// anything above this is a mis-filtered candidate flood, not real results).
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
    // Keep only flat-sale result notices; drop dzierżawa/najem/działka results.
    if (!/informacj\w*\s+o\s+wynik|cena\s+osi[ąa]gni|wynik\w*\s+negatywn/.test(t)) continue;
    if (!/lokal\w*\s+mieszkaln|mieszkani/.test(t)) continue;
    if (/dzier[żz]aw|najem|wynaj|dzia[łl]k|lokal\w*\s+u[żz]ytkow/.test(t)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    // The stub carries the description; the achieved price lives in the BIP
    // article's attachment — follow it and prefer its text when it extracts.
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
    // Registry contract: refresh.js reads ref.auction_date + ref.pdf_url (not
    // date/url) — use the canonical field names so the source link is wired
    // through to the record and diagnostics, matching the other result cities.
    docs.push({ text, auction_date: (p.date || '').slice(0, 10) || null, pdf_url: sourceUrl });
  }

  console.error(`  belchatow crawlResultDocs: ${docs.length} result doc(s)`);
  return docs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
