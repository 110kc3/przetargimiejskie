import { BASE_URL, CATEGORY_URL, MAX_PAGES, FETCH_OPTS } from './config.js';
import { parseNotice } from './parse.js';

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
    const listUrl = page === 1 ? `${CATEGORY_URL}/` : `${CATEGORY_URL}/page/${page}/`;
    let listHtml = '';
    try {
      listHtml = await fetchHtml(listUrl);
    } catch {
      continue;
    }

    const itemRegex = /<h[23][^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = itemRegex.exec(listHtml)) !== null) {
      const fullUrl = match[1];
      const titleRaw = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      const id = fullUrl.replace(BASE_URL, '').replace(/^\/+|\/+$/g, '').split('/').pop() || 'notice';

      try {
        const detailHtml = await fetchHtml(fullUrl);

        const timeMatch = detailHtml.match(/<time[^>]*datetime="([^"]+)"/i) ||
                          detailHtml.match(/class="[^"]*posted-on[^"]*"[\s\S]*?>([^<]+)</i);
        const dateStr = timeMatch ? timeMatch[1].slice(0, 10) : null;

        const mainMatch = detailHtml.match(/<div class="[^"]*entry-content[^"]*"[\s\S]*?<\/div>/i) ||
                          detailHtml.match(/<article[\s\S]*?<\/article>/i);
        const contentText = mainMatch ? mainMatch[0].replace(/<[^>]+>/g, ' ') : '';

        const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/gi)].map(m => m[1]);
        const uniquePdfs = [...new Set(pdfMatches)];

        const attachments = uniquePdfs.map(p => ({
          name: p.split('/').pop() || 'zalacznik.pdf',
          url: p.startsWith('http') ? p : `${BASE_URL}${p}`,
        }));

        const parsed = parseNotice({
          id,
          title: titleRaw,
          content: contentText,
          attachmentsText: '',
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
