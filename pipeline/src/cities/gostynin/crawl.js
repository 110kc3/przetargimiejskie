import { BASE_URL, BOARDS, FETCH_OPTS } from './config.js';
import { parseNotice } from './parse.js';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';

export async function crawl() {
  const notices = [];
  const seenIds = new Set();

  for (const board of BOARDS) {
    let boardHtml = '';
    try {
      boardHtml = await getText(`${BASE_URL}${board}`, FETCH_OPTS);
    } catch {
      continue;
    }

    const itemRegex = /<li[^>]*>\s*<a[^>]*href="([^"]*\/id\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = itemRegex.exec(boardHtml)) !== null) {
      const relHref = match[1];
      const id = match[2];
      const titleRaw = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (['1', '2', '3', '4', '152', '106', '107', '109', '110', '173', '174', '175', '213'].includes(id)) {
        continue;
      }
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const detailUrl = relHref.startsWith('http') ? relHref : `${BASE_URL}/id/${id}`;

      try {
        const detailHtml = await getText(detailUrl, FETCH_OPTS);

        const pdfMatches = [...detailHtml.matchAll(/href="([^"]*(?:\/pliki\/umgostynin\/[^"]*|\.pdf))"/gi)].map(m => m[1]);
        const uniquePdfs = [...new Set(pdfMatches)];

        let attachmentsText = '';
        const attachments = [];

        for (const pdfRel of uniquePdfs) {
          const cleanRel = pdfRel.split('?')[0];
          const pdfUrl = cleanRel.startsWith('http') ? cleanRel : `${BASE_URL}${cleanRel}`;
          attachments.push({
            name: cleanRel.split('/').pop() || 'zalacznik.pdf',
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
                          detailHtml.match(/<div id="content"[\s\S]*?<\/div>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const dateMatch = detailHtml.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
        const dateStr = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

        const parsed = parseNotice({
          id,
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
