
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { parseXmlFeed, isResultNotice, areaFromDetailHtml, splitMultiFlatNotice } from './parse.js';

const ORIGIN = 'https://bip.torun.pl';
const XML_URL = `${ORIGIN}/przetargi-nieruchomosci/xml/1/200`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const RESULT_NOTICE_RE = /info\s+o\s+wyniku|wynik\w*\s+przetarg/i;

export function attachmentsFromDetailHtml(html) {
  const out = [];
  const blockRe =
    /<a[^>]*id="attachments-title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)(?=<a[^>]*id="attachments-title"|<\/div>|<input\b)/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/gi, '&').trim();
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const url = /^https?:\/\//.test(href) ? href : ORIGIN + href;
    out.push({ url, label });
  }
  return out;
}

export function resultDocAttachments(attachments) {
  return attachments.filter(
    (a) => RESULT_NOTICE_RE.test(a.label) && /\bdocx?\b/i.test(a.label),
  );
}


let crawlPromise = null;

async function crawlAll() {
  let xml;
  try {
    xml = await getText(XML_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  torun XML fetch failed: ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const records = parseXmlFeed(xml);
  console.error(`  torun XML: ${records.length} total records`);

  const flatRecords = records.filter((r) => r.kind === 'mieszkalny');
  console.error(`  torun: ${flatRecords.length} lokal mieszkalny records`);

  const expanded = [];
  for (const record of flatRecords) {
    if (/m\.\s*nr[\s\S]*i\s+nr/i.test(record.address_raw)) {
      const html = await getText(record.detail_url, FETCH_OPTS);
      expanded.push(...splitMultiFlatNotice(record, html));
    } else expanded.push(record);
  }
  const listings = expanded.map((r) => {
    const address = parseAddress(r.address_raw);
    return {
      kind: r.kind,
      address_raw: r.address_raw,
      address,
      auction_date: r.auction_date,
      round: r.round,
      area_m2: r.area_m2 ?? null, // multi-flat detail paragraphs carry individual areas
      starting_price_pln: r.starting_price_pln,
      detail_url: r.detail_url,
    };
  });

  const resolvedFlats = flatRecords.filter((r) => r.resolved);
  console.error(`  torun: ${resolvedFlats.length} resolved flat(s) to check for result docs`);

  const resultRefs = [];
  for (const rec of resolvedFlats) {
    let detailHtml;
    try {
      detailHtml = await getText(rec.detail_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  torun detail fetch failed ${rec.detail_url}: ${err.message}`);
      continue;
    }

    const allAttachments = attachmentsFromDetailHtml(detailHtml);
    const resultAtts = resultDocAttachments(allAttachments);
    if (resultAtts.length === 0) {
      console.error(`  torun: no result-doc attachments on ${rec.detail_url}`);
      continue;
    }

    for (const att of resultAtts) {
      let text;
      try {
        text = await docText(att.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  torun DOCX extract failed ${att.url}: ${err.message}`);
        continue;
      }
      if (!isResultNotice(text)) {
        console.error(`  torun: attachment is not a result notice: ${att.url}`);
        continue;
      }
      resultRefs.push({
        text,
        pdf_url: att.url,
        auction_date: rec.auction_date,
        label: att.label,
      });
    }
  }

  console.error(`  torun: ${listings.length} flat listings, ${resultRefs.length} result doc(s)`);
  return { listings, wykaz: [], resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlDetailAreas() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;

  const areas = new Map();
  for (const listing of listings) {
    if (!listing.detail_url || !listing.address) continue;
    if (listing.area_m2 != null) { areas.set(listing.address.key, listing.area_m2); continue; }

    let html;
    try {
      html = await getText(listing.detail_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  torun detail-area fetch failed ${listing.detail_url}: ${err.message}`);
      continue;
    }

    const area = areaFromDetailHtml(html);
    if (area == null) {
      console.error(`  torun: no area found on detail page ${listing.detail_url}`);
      continue;
    }

    areas.set(listing.address.key, area);
    console.error(`  torun detail area: ${listing.address.key} = ${area} m2`);
  }

  console.error(`  torun crawlDetailAreas: ${areas.size} area(s) extracted`);
  return areas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
