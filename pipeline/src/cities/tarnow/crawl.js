import { BASE_URL, HARMONOGRAM_URL, FETCH_OPTS } from './config.js';
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
  let html = '';
  try {
    html = await fetchHtml(HARMONOGRAM_URL);
  } catch {
    return notices;
  }

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let match;
  let rowIndex = 0;

  while ((match = rowRegex.exec(html)) !== null) {
    rowIndex++;
    const rowHtml = match[1];

    const colMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c =>
      c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    );

    if (colMatches.length < 5) continue;

    // Col 0: Ulica, Col 1: Działka, Col 2: Obręb, Col 3: Przeznaczenie, Col 4: Powierzchnia, Col 5: Termin
    const ulica = colMatches[0];
    const dzialka = colMatches[1];
    const obreb = colMatches[2];
    const przeznaczenie = colMatches[3];
    const powierzchnia = colMatches[4];
    const termin = colMatches[5] || '';

    const title = `Sprzedaż nieruchomości ${ulica} ${dzialka} (obręb ${obreb})`;
    const content = `${title}\nPrzeznaczenie: ${przeznaczenie}\nPowierzchnia: ${powierzchnia}\nTermin przetargu: ${termin}`;

    const parsed = parseNotice({
      id: `harmonogram-${rowIndex}`,
      title,
      content,
      attachmentsText: '',
      date: null,
      url: HARMONOGRAM_URL,
      attachments: [],
    });

    if (parsed) {
      notices.push(parsed);
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
