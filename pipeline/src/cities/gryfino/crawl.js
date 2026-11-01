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
  const seenSoids = new Set();

  for (const board of BOARDS) {
    let boardHtml = '';
    try {
      boardHtml = await fetchHtml(`${BASE_URL}${board}`);
    } catch {
      continue;
    }

    const rowRegex = /<tr[^>]*onclick="window\.location=&quot;([^&"]+)\?soid=([A-F0-9]+)&quot;"[^>]*>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/gi;
    let match;

    while ((match = rowRegex.exec(boardHtml)) !== null) {
      const pageFile = match[1];
      const soid = match[2];
      const dateRaw = match[3].replace(/&nbsp;/g, ' ').trim();
      const titleRaw = match[4].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').trim();

      if (seenSoids.has(soid)) continue;
      seenSoids.add(soid);

      // Only inspect recent years (2024-2026)
      if (!/(?:202[4-9]|203\d)/.test(dateRaw) && !/(?:202[4-9]|203\d)/.test(titleRaw)) {
        continue;
      }

      const detailUrl = `${BASE_URL}/${pageFile}?soid=${soid}`;

      try {
        const detailHtml = await fetchHtml(detailUrl);

        // Find attachment links
        const fileMatches = [...detailHtml.matchAll(/href="([^"]*(?:files\/|\.pdf|\.docx?))"/gi)].map(m => m[1]);
        const uniqueFiles = [...new Set(fileMatches)];

        let attachmentsText = '';
        const attachments = [];

        for (const fRel of uniqueFiles) {
          const fUrl = fRel.startsWith('http') ? fRel : `${BASE_URL}${fRel}`;
          attachments.push({
            name: fRel.split('/').pop() || 'zalacznik.pdf',
            url: fUrl,
          });

          if (fRel.toLowerCase().endsWith('.pdf') || fRel.includes('/files/')) {
            try {
              const txt = await pdfText(fUrl, FETCH_OPTS);
              if (txt) {
                attachmentsText += '\n' + txt;
              }
            } catch {
              // Ignore PDF download error
            }
          }
        }

        const mainMatch = detailHtml.match(/<table[\s\S]*?<\/table>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const parsed = parseNotice({
          id: soid,
          title: titleRaw,
          content: contentText,
          attachmentsText,
          date: dateRaw,
          url: detailUrl,
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
