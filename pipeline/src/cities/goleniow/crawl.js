import { BASE_URL, BOARDS, FETCH_OPTS } from './config.js';
import { parseNotice } from './parse.js';
import { pdfText } from '../../core/pdf-text.js';

async function fetchHtml(url) {
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return await res.text();
}

export async function crawl() {
  const notices = [];
  const seenUrls = new Set();

  for (const board of BOARDS) {
    let boardHtml = '';
    try {
      boardHtml = await fetchHtml(`${BASE_URL}${board}`);
    } catch {
      continue;
    }

    const rowRegex = /<tr>\s*<td><a href="(\/artykul\/[^"]+)">([\s\S]*?)<\/td>\s*<td>(\d{4}-\d{2}-\d{2}[^<]*)<\/td>\s*<\/tr>/gi;
    let match;

    while ((match = rowRegex.exec(boardHtml)) !== null) {
      const relHref = match[1];
      const titleRaw = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const dateRaw = match[3].trim();

      const fullUrl = `${BASE_URL}${relHref}`;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      if (!/(?:202[4-9]|203\d)/.test(dateRaw) && !/(?:202[4-9]|203\d)/.test(titleRaw)) {
        continue;
      }

      const id = relHref.replace(/^\/artykul\//, '');

      try {
        const articleHtml = await fetchHtml(fullUrl);

        const pdfMatches = [...articleHtml.matchAll(/href="([^"]*(?:\.pdf|\/zalaczniki\/[^"]*))"/gi)].map(m => m[1]);
        const uniquePdfs = [...new Set(pdfMatches)];

        let attachmentsText = '';
        const attachments = [];

        for (const pdfRel of uniquePdfs) {
          const pdfUrl = pdfRel.startsWith('http') ? pdfRel : `${BASE_URL}${pdfRel}`;
          attachments.push({
            name: pdfRel.split('/').pop() || 'zalacznik.pdf',
            url: pdfUrl,
          });

          if (pdfRel.toLowerCase().endsWith('.pdf') || pdfRel.includes('/zalaczniki/')) {
            try {
              const txt = await pdfText(pdfUrl, FETCH_OPTS);
              if (txt) {
                attachmentsText += '\n' + txt;
              }
            } catch {
              // Ignore PDF download error
            }
          }
        }

        const mainMatch = articleHtml.match(/<div class="[^"]*article-content[^"]*"[\s\S]*?<\/div>/i) ||
                          articleHtml.match(/<main[\s\S]*?<\/main>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const parsed = parseNotice({
          id,
          title: titleRaw,
          content: contentText,
          attachmentsText,
          date: dateRaw,
          url: fullUrl,
          attachments,
        });

        if (parsed) {
          notices.push(parsed);
        }
      } catch {
        // Ignore single article error
      }
    }
  }

  return notices;
}

let crawlPromise = null;
async function crawlAll() {
  const notices = await crawl();
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];

  for (const n of notices) {
    if (n.status === "result") {
      resultRefs.push({
        text: n.title,
        pdf_url: n.url,
        detail_url: n.url,
        auction_date: n.auctionDate,
      });
    } else if (n.status === "wykaz") {
      wykaz.push({
        address: n.address,
        parcels: n.parcels,
        detail_url: n.url,
      });
    } else if (n.propertyType === "land") {
      land.push({
        kind: "grunt",
        dzialka_nr: (n.parcels && n.parcels[0]) || null,
        area_m2: n.areaM2,
        address_raw: n.address,
        starting_price_pln: n.price,
        auction_date: n.auctionDate,
        detail_url: n.url,
      });
    } else {
      listings.push({
        kind: n.propertyType === "commercial" ? "uzytkowy" : (n.propertyType === "garage" ? "garaz" : "mieszkalny"),
        address: n.address,
        area_m2: n.areaM2,
        starting_price_pln: n.price,
        auction_date: n.auctionDate,
        detail_url: n.url,
      });
    }
  }

  return {
    listings,
    wykaz,
    land,
    resultRefs,
    valid_empty: notices.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}
