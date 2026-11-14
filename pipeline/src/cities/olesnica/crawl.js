import { BASE_URL, BOARD_URL, MAX_PAGES, FETCH_OPTS } from './config.js';
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

  for (let page = 1; page <= MAX_PAGES; page++) {
    const listUrl = `${BOARD_URL}?strona=${page}`;
    let listHtml = '';
    try {
      listHtml = await fetchHtml(listUrl);
    } catch {
      continue;
    }

    const itemRegex = /<a[^>]*href="(\/urzad\/ogloszenia-burmistrza\/[^"]*\/idn:(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = itemRegex.exec(listHtml)) !== null) {
      const relHref = match[1];
      const idn = match[2];
      const titleRaw = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const detailUrl = `${BASE_URL}${relHref}`;
      if (seenUrls.has(detailUrl)) continue;
      seenUrls.add(detailUrl);

      try {
        const detailHtml = await fetchHtml(detailUrl);

        const pdfMatches = [...detailHtml.matchAll(/href="([^"]*(?:\/download\/[^"]*|\.pdf))"/gi)].map(m => m[1]);
        const uniquePdfs = [...new Set(pdfMatches)];

        let attachmentsText = '';
        const attachments = [];

        for (const pdfRel of uniquePdfs) {
          const pdfUrl = pdfRel.startsWith('http') ? pdfRel : `${BASE_URL}${pdfRel}`;
          attachments.push({
            name: pdfRel.split('/').pop() || 'zalacznik.pdf',
            url: pdfUrl,
          });

          if (pdfRel.toLowerCase().endsWith('.pdf') || pdfRel.includes('/download/')) {
            try {
              const txt = await pdfText(pdfUrl, FETCH_OPTS);
              if (txt) {
                attachmentsText += '\n' + txt;
              }
            } catch {
            }
          }
        }

        const dateMatch = detailHtml.match(/(\d{1,2})\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)\s+(\d{4})/i);
        const dateStr = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

        const mainMatch = detailHtml.match(/<article[\s\S]*?<\/article>/i) ||
                          detailHtml.match(/<div class="[^"]*tresc[^"]*"[\s\S]*?<\/div>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const parsed = parseNotice({
          id: idn,
          title: titleRaw,
          content: contentText,
          attachmentsText,
          date: dateStr,
          url: detailUrl,
          attachments,
        });

        if (parsed) {
          notices.push(parsed);
        }
      } catch {
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
