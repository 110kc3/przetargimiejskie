// Wodzisław Śląski crawler — FINN eUrząd JSON-RPC service.
//
// The city BIP (bip.wodzislaw-slaski.pl) embeds the FINN.pl eUrząd SPA
// (eurzad.finn.pl/gmwodzislawsl) in an iframe.
// Rather than spinning up a headless browser, this adapter queries the FINN
// eUrząd JSON-RPC backend directly:
//   - POST /rpc/routeRejestryServiceManager1 ("pobierzRejestry"): enumerates register items
//   - POST /rpc/routeRejestryServiceManager2 ("pobierzRejestr"): fetches item detail + attachments
//   - GET /server/pobierz_rejestry_zalacznik/<id>: downloads PDF attachments
//
// Registers crawled:
//   - IAG-Opost: Ogłoszenia o przetargach (active auctions -> listings + land)
//   - NWP: Informacje o wynikach przetargów na zbycie nieruchomości (results -> crawlResultDocs)
//   - IAG-Wsprz: Wykaz nieruchomości przeznaczonych do sprzedaży (wykaz)

import { pathToFileURL } from 'node:url';
import { directFetch } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  isSaleAnnouncement,
  isResultNotice,
  parseAnnouncement,
  parseResultDoc,
} from './parse.js';

const ORIGIN = 'https://eurzad.finn.pl/gmwodzislawsl';
const RPC_BASE = `${ORIGIN}/rpc`;
const PUBLIC_BASE = `${ORIGIN}/?color=blue#!/rejestr/`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Call FINN eUrząd JSON-RPC endpoint. */
export async function callRpc(route, params) {
  const res = await directFetch(`${RPC_BASE}/${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: '', params }),
  });
  if (!res.ok) throw new Error(`FINN RPC error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`FINN RPC error: ${JSON.stringify(data.error)}`);
  return JSON.parse(data.result);
}

/** Fetch item details including attachments list. */
export async function fetchItemDetail(id) {
  return callRpc('routeRejestryServiceManager2', [JSON.stringify(String(id))]);
}

/** Fetch list of items from a register. */
export async function fetchRegisterPage(symbol, pageSize = 50, pageNumber = 1) {
  return callRpc('routeRejestryServiceManager1', [
    JSON.stringify(symbol),
    String(pageSize),
    String(pageNumber),
    '"DEFAULT"',
    '{}',
  ]);
}

let crawlPromise = null;

export async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];

  const maxDocs = Number(process.env.WOD_MAX_DOCS) || 60;
  const deadline = Date.now() + (Number(process.env.WOD_CRAWL_BUDGET_MS) || 12 * 60 * 1000);

  // 1) Results (NWP) - achieved-price stream.
  // One page of size 100 covers all historical results.
  console.error('  wodzislaw-slaski: querying NWP results register...');
  try {
    const knownUrls = loadKnownSourceUrls('wodzislaw-slaski');
    const nwpPage = await fetchRegisterPage('NWP', 100, 1);
    const nwpItems = nwpPage?.lista || [];
    console.error(`  wodzislaw-slaski: found ${nwpItems.length} NWP result item(s)`);

    for (const item of nwpItems) {
      if (Date.now() > deadline) {
        console.error('  wodzislaw-slaski: crawl budget reached during NWP results');
        break;
      }
      try {
        const detail = await fetchItemDetail(item.id);
        const zal = (detail.zalaczniki || []).find((z) => /\.pdf$/i.test(z.nazwa));
        if (!zal) continue;
        const pdfUrl = `${ORIGIN}/server/pobierz_rejestry_zalacznik/${zal.id}`;
        const publicUrl = `${PUBLIC_BASE}${item.id}`;

        let text = '';
        try {
          text = await pdfText(pdfUrl);
        } catch (err) {
          console.error(`  wodzislaw-slaski: failed to extract result PDF ${pdfUrl}: ${err.message}`);
          continue;
        }

        if (!text || !isResultNotice(text)) continue;

        resultRefs.push({
          text,
          pdf_url: pdfUrl,
          detail_url: publicUrl,
          auction_date: null,
        });
      } catch (err) {
        console.error(`  wodzislaw-slaski: error processing NWP item ${item.id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  wodzislaw-slaski: error querying NWP register: ${err.message}`);
  }

  // 2) Announcements (IAG-Opost).
  console.error('  wodzislaw-slaski: querying IAG-Opost announcements register...');
  try {
    const annPage = await fetchRegisterPage('IAG-Opost', 60, 1);
    const annItems = annPage?.lista || [];
    console.error(`  wodzislaw-slaski: found ${annItems.length} IAG-Opost announcement item(s)`);

    let processed = 0;
    for (const item of annItems) {
      if (processed >= maxDocs || Date.now() > deadline) break;
      if (!isSaleAnnouncement(item.temat)) continue;

      try {
        const detail = await fetchItemDetail(item.id);
        const attachments = detail.zalaczniki || [];
        const pdfAtt =
          attachments.find((z) => /\.pdf$/i.test(z.nazwa) && /og[łl]oszen/i.test(z.nazwa)) ||
          attachments.find((z) => /\.pdf$/i.test(z.nazwa) && !/mapa|ortofoto/i.test(z.nazwa)) ||
          attachments.find((z) => /\.pdf$/i.test(z.nazwa));

        if (!pdfAtt) continue;

        const pdfUrl = `${ORIGIN}/server/pobierz_rejestry_zalacznik/${pdfAtt.id}`;
        const publicUrl = `${PUBLIC_BASE}${item.id}`;

        let text = '';
        try {
          text = await pdfText(pdfUrl);
        } catch (err) {
          console.error(`  wodzislaw-slaski: failed to extract ann PDF ${pdfUrl}: ${err.message}`);
          continue;
        }

        const recs = parseAnnouncement(item.temat, text, publicUrl);
        for (const rec of recs) {
          if (rec.kind === 'grunt') {
            land.push(rec);
          } else {
            listings.push(rec);
          }
        }
        processed++;
      } catch (err) {
        console.error(`  wodzislaw-slaski: error processing announcement ${item.id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  wodzislaw-slaski: error querying IAG-Opost register: ${err.message}`);
  }

  // 3) Wykaz (IAG-Wsprz) - filter out tenant purchases, keep auction intents if any.
  console.error('  wodzislaw-slaski: checking IAG-Wsprz wykaz register...');
  try {
    const wykazPage = await fetchRegisterPage('IAG-Wsprz', 30, 1);
    const wykazItems = wykazPage?.lista || [];
    for (const item of wykazItems) {
      // Tenant purchase is out of scope
      if (/bezprzetarg|na\s+rzecz\s+najemc/i.test(item.temat)) continue;
      if (!/przetarg/i.test(item.temat)) continue;

      try {
        const detail = await fetchItemDetail(item.id);
        const attachments = detail.zalaczniki || [];
        const pdfAtt = attachments.find((z) => /\.pdf$/i.test(z.nazwa));
        if (!pdfAtt) continue;

        const pdfUrl = `${ORIGIN}/server/pobierz_rejestry_zalacznik/${pdfAtt.id}`;
        const publicUrl = `${PUBLIC_BASE}${item.id}`;
        let text = '';
        try {
          text = await pdfText(pdfUrl);
        } catch {
          continue;
        }

        const recs = parseAnnouncement(item.temat, text, publicUrl);
        for (const r of recs) {
          if (r.kind !== 'grunt') {
            wykaz.push({
              kind: r.kind,
              address: r.address,
              address_raw: r.address_raw,
              published_date: item.dataW ? item.dataW.slice(0, 10) : null,
              detail_url: publicUrl,
              source_pdf: pdfUrl,
            });
          }
        }
      } catch {
        // non-critical
      }
    }
  } catch (err) {
    console.error(`  wodzislaw-slaski: error checking IAG-Wsprz: ${err.message}`);
  }

  const valid_empty = listings.length === 0;
  const valid_empty_land = land.length === 0;

  console.error(
    `  wodzislaw-slaski: ${listings.length} flat/house listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz, ${resultRefs.length} result notice(s)`,
  );

  return {
    listings,
    wykaz,
    land,
    resultRefs,
    valid_empty,
    valid_empty_land,
  };
}

/** Achieved-price stream. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active listings + land + wykaz. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return {
    listings,
    wykaz,
    land,
    valid_empty,
    valid_empty_land,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: active.listings.length,
        land: active.land.length,
        wykaz: active.wykaz.length,
        results: results.length,
        valid_empty: active.valid_empty,
        valid_empty_land: active.valid_empty_land,
        sampleListing: active.listings[0],
        sampleLand: active.land[0],
        sampleResult: results[0] && {
          ...results[0],
          text: results[0].text.slice(0, 120) + '…',
        },
      },
      null,
      2,
    ) + '\n',
  );
}
