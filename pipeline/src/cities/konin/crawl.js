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
    const listUrl = `${BOARD_URL}?p=${page}`;
    let listHtml = '';
    try {
      listHtml = await fetchHtml(listUrl);
    } catch {
      continue;
    }

    const itemRegex = /<a[^>]*href="([^"]+\.htmlx)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = itemRegex.exec(listHtml)) !== null) {
      const relHref = match[1];
      const titleRaw = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!titleRaw.toLowerCase().includes('przetarg') && !relHref.toLowerCase().includes('przetarg')) {
        continue;
      }
      if (titleRaw.toLowerCase() === 'przetargi' || titleRaw.toLowerCase() === 'czytaj więcej') {
        continue;
      }

      const fullUrl = relHref.startsWith('http') ? relHref : `${BASE_URL}/${relHref.replace(/^\/+/, '')}`;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      const id = relHref.replace(/\.htmlx$/i, '').replace(/^[./]+/, '').slice(0, 80);

      try {
        const detailHtml = await fetchHtml(fullUrl);

        const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/gi)].map(m => m[1]);
        const uniquePdfs = [...new Set(pdfMatches)].filter(p => !p.includes('Strategia') && !p.includes('SSE'));

        let attachmentsText = '';
        const attachments = [];

        for (const pdfRel of uniquePdfs) {
          const pdfUrl = pdfRel.startsWith('http') ? pdfRel : `${BASE_URL}/${pdfRel.replace(/^\/+/, '')}`;
          attachments.push({
            name: pdfRel.split('/').pop() || 'zalacznik.pdf',
            url: pdfUrl,
          });

          try {
            const txt = await pdfText(pdfUrl, FETCH_OPTS);
            if (txt) {
              attachmentsText += '\n' + txt;
            }
          } catch {
          }
        }

        const mainMatch = detailHtml.match(/<div class="[^"]*tresc[^"]*"[\s\S]*?<\/div>/i) ||
                          detailHtml.match(/<article[\s\S]*?<\/article>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const dateMatch = detailHtml.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
        const dateStr = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

        const parsed = parseNotice({
          id,
          title: titleRaw,
          content: contentText,
          attachmentsText,
          date: dateStr,
          url: fullUrl,
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
