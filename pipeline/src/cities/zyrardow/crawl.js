import { BASE_URL, MENU_ROOT_ID, FETCH_OPTS } from './config.js';
import { parseNotice } from './parse.js';
import { pdfText } from '../../core/pdf-text.js';

async function fetchJson(url) {
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return await res.json();
}

export async function crawl() {
  const notices = [];
  const menuData = await fetchJson(`${BASE_URL}/api/menu/${MENU_ROOT_ID}`);

  const rootMenu = Array.isArray(menuData)
    ? menuData.find(m => String(m.id) === String(MENU_ROOT_ID))
    : menuData;

  const targetMenuIds = new Set();

  if (rootMenu && Array.isArray(rootMenu.children)) {
    for (const yearMenu of rootMenu.children) {
      const name = yearMenu.name || '';
      if (!/(?:202[4-9]|203\d)/.test(name)) continue;

      if (Array.isArray(yearMenu.children) && yearMenu.children.length > 0) {
        for (const sub of yearMenu.children) {
          const id = sub.targetId || sub.id;
          if (id) targetMenuIds.add(String(id));
        }
      } else {
        const id = yearMenu.targetId || yearMenu.id;
        if (id) targetMenuIds.add(String(id));
      }
    }
  }

  if (targetMenuIds.size === 0) {
    targetMenuIds.add('5915');
    targetMenuIds.add('5916');
    targetMenuIds.add('5806');
  }

  const seenArticleIds = new Set();

  for (const menuId of targetMenuIds) {
    try {
      const articlesData = await fetchJson(`${BASE_URL}/api/menu/${menuId}/articles?limit=50&page=1`);
      const articles = articlesData.articles || [];

      for (const item of articles) {
        const artId = String(item.id);
        if (seenArticleIds.has(artId)) continue;
        seenArticleIds.add(artId);

        try {
          const detail = await fetchJson(`${BASE_URL}/api/articles/${artId}`);
          const title = detail.title ||
            item.aliasFields?.find(f => f.alias === 'title')?.value ||
            '';

          const dateField = item.columnFields?.find(f => /\d{4}-\d{2}-\d{2}/.test(f.value || ''));
          const date = dateField ? dateField.value : (detail.basicData?.publishDate || null);

          let attachmentsText = '';
          const attachments = [];

          if (Array.isArray(detail.attachments)) {
            for (const att of detail.attachments) {
              const fileUrl = `${BASE_URL}/${att.link}`;
              attachments.push({
                name: att.name || 'Dokument',
                url: fileUrl,
              });

              if (att.extension === 'pdf' || (att.name && att.name.toLowerCase().endsWith('.pdf'))) {
                try {
                  const txt = await pdfText(fileUrl, FETCH_OPTS);
                  if (txt) {
                    attachmentsText += '\n' + txt;
                  }
                } catch {
                }
              }
            }
          }

          const parsed = parseNotice({
            id: artId,
            title,
            content: detail.content || '',
            attachmentsText,
            date,
            url: `${BASE_URL}/${item.link || detail.link}`,
            attachments,
          });

          if (parsed) {
            notices.push(parsed);
          }
        } catch {
        }
      }
    } catch {
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
