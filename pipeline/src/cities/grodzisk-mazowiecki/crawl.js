// Grodzisk Mazowiecki crawler.
//
// crawlActive():
//   Fetches announcements & wykazy from https://nieruchomosci.grodzisk.pl/
//   via WP REST API (with HTML category pagination fallback).
//   Resolves attached announcement PDFs directly from WordPress or via the
//   corresponding BIP auction menu / article.
//   Returns { listings, wykaz, land, valid_empty: false, valid_empty_land: false }.
//
// crawlResultDocs():
//   Fetches achieved-price result notices ("Informacja o wyniku przetargu")
//   from BIP Grodzisk Mazowiecki (bip.grodzisk.pl) via its Logonet REST API:
//   /api/menu/<wgn_id> -> /api/menu/<auction_id>/articles -> /api/articles/<id>.
//   Extracts text from born-digital (or scanned) result PDFs.
//   Returns array of result refs { text, pdf_url, detail_url, auction_date }.

import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAnnouncement, isWykaz, roundFromText } from './parse.js';

const WP_ORIGIN = 'https://nieruchomosci.grodzisk.pl';
const BIP_ORIGIN = 'https://bip.grodzisk.pl';

// BIP WGN year menus to inspect for results and announcements
const WGN_YEAR_MENUS = [5545, 5188]; // 2026, 2025

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

/** Fetch JSON from an endpoint with timeout and browser UA */
async function fetchJson(url) {
  const text = await getText(url, FETCH_OPTS);
  return JSON.parse(text);
}

/** Extract text from a PDF URL, falling back to OCR if pdftotext yields empty/garbage */
async function extractPdfText(url) {
  try {
    let t = await pdfText(url);
    if (!t || t.trim().length < 50) {
      t = await ocrPdf(url);
    }
    return t;
  } catch (err) {
    console.error(`  grodzisk-mazowiecki: PDF extraction failed for ${url}: ${err.message}`);
    return '';
  }
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

let activePromise = null;

async function harvestWpPosts() {
  // 1. Try WP REST API first (fast and complete)
  try {
    const apiUrl = `${WP_ORIGIN}/wp-json/wp/v2/posts?per_page=100`;
    const data = await fetchJson(apiUrl);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((p) => ({
        id: p.id,
        title: p.title?.rendered?.replace(/&#8211;/g, '-').replace(/&nbsp;/g, ' ') || '',
        content: p.content?.rendered || '',
        link: p.link || '',
        categories: p.categories || [],
      }));
    }
  } catch (err) {
    console.error(`  grodzisk-mazowiecki: WP REST API failed (${err.message}), falling back to HTML`);
  }

  // 2. HTML category fallback
  const posts = [];
  const seenUrls = new Set();
  const categories = [
    'aktualne',
    'planowane',
    'archiwum-zprzedaz',
    'archiwum-planowane',
  ];

  for (const cat of categories) {
    for (let page = 1; page <= 5; page++) {
      const catUrl = page === 1
        ? `${WP_ORIGIN}/category/${cat}/`
        : `${WP_ORIGIN}/category/${cat}/page/${page}/`;

      let html;
      try {
        html = await getText(catUrl, FETCH_OPTS);
      } catch (err) {
        break; // 404 or end of pages
      }

      const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
      let am;
      let countOnPage = 0;
      while ((am = articleRe.exec(html)) !== null) {
        const chunk = am[1];
        const linkM = /href="([^"]+)"/i.exec(chunk);
        const titleM = /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i.exec(chunk);
        if (linkM && titleM) {
          const url = linkM[1];
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            const title = titleM[1].replace(/<[^>]+>/g, '').replace(/&#8211;/g, '-').trim();
            posts.push({ id: url, title, content: chunk, link: url, categories: [] });
            countOnPage++;
          }
        }
      }
      if (countOnPage === 0) break;
    }
  }

  return posts;
}

/** Resolve the announcement PDF URL for a post */
async function resolveAnnouncementPdf(post, auctionMenus = []) {
  const content = post.content || '';

  // 1. Direct PDF attachment in post content
  const directPdfM = /href="([^"]+\/wp-content\/uploads\/[^"]+\.pdf)"/i.exec(content);
  if (directPdfM) {
    return directPdfM[1];
  }

  // 2. BIP article link: /a,<id>,...
  const bipArtM = /bip\.grodzisk\.pl\/a,(\d+)/i.exec(content);
  if (bipArtM) {
    try {
      const art = await fetchJson(`${BIP_ORIGIN}/api/articles/${bipArtM[1]}`);
      if (/wgn|przetarg|sprzeda|lokal|nieruchomo|grunt/i.test(`${art.title || ''} ${art.link || ''}`)) {
        const pdfAtt = (art.attachments || []).find((a) => a.extension === 'pdf' && !/regulamin|wypis/i.test(a.name));
        if (pdfAtt) return `${BIP_ORIGIN}/${pdfAtt.link}`;
      }
    } catch {
      // ignore
    }
  }

  // 3. BIP menu link: /m,<id>,...
  const bipMenuM = /bip\.grodzisk\.pl\/m,(\d+)/i.exec(content);
  if (bipMenuM) {
    try {
      const data = await fetchJson(`${BIP_ORIGIN}/api/menu/${bipMenuM[1]}/articles?limit=50`);
      const annArt = (data.articles || []).find((a) => !/wynik|rozstrzyg/i.test(a.link || ''));
      if (annArt) {
        const art = await fetchJson(`${BIP_ORIGIN}/api/articles/${annArt.id}`);
        const pdfAtt = (art.attachments || []).find((a) => a.extension === 'pdf' && !/regulamin|wypis/i.test(a.name));
        if (pdfAtt) return `${BIP_ORIGIN}/${pdfAtt.link}`;
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback: match by WGN case reference against BIP auction submenus
  if (Array.isArray(auctionMenus) && auctionMenus.length > 0) {
    const caseM = /WGN[.\s\d]+/i.exec(`${post.title} ${content}`);
    if (caseM) {
      const normCase = caseM[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const round = roundFromText(post.title) ?? roundFromText(content);
      const romanRound = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' }[round] || '';
      const matched = auctionMenus.find((m) => {
        const norm = (m.name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return norm.includes(normCase) && (!romanRound || norm.includes(romanRound));
      });
      if (matched) {
        try {
          const data = await fetchJson(`${BIP_ORIGIN}/api/menu/${matched.id}/articles?limit=50`);
          const annArt = (data.articles || []).find((a) => !/wynik|rozstrzyg/i.test(a.link || ''));
          if (annArt) {
            const art = await fetchJson(`${BIP_ORIGIN}/api/articles/${annArt.id}`);
            const pdfAtt = (art.attachments || []).find((a) => a.extension === 'pdf' && !/regulamin|wypis/i.test(a.name));
            if (pdfAtt) return `${BIP_ORIGIN}/${pdfAtt.link}`;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

export async function crawlActive() {
  activePromise ??= (async () => {
    // Collect BIP auction submenus for fallback resolution
    const auctionMenus = [];
    for (const mid of WGN_YEAR_MENUS) {
      try {
        const tree = await fetchJson(`${BIP_ORIGIN}/api/menu/${mid}`);
        function findChildren(arr, id) {
          if (!Array.isArray(arr)) return;
          for (const item of arr) {
            if (item.id == id && Array.isArray(item.children)) {
              for (const c of item.children) auctionMenus.push({ id: c.id, name: c.name });
            }
            if (item.children) findChildren(item.children, id);
          }
        }
        findChildren(tree, mid);
      } catch {
        // ignore
      }
    }

    const rawPosts = await harvestWpPosts();
    console.error(`  grodzisk-mazowiecki: harvested ${rawPosts.length} posts from WordPress`);

    const listings = [];
    const wykaz = [];
    const land = [];

    for (const post of rawPosts) {
      const isWyk = post.categories.includes(9) || post.categories.includes(11) || isWykaz(`${post.title} ${post.content}`);
      const pdfUrl = await resolveAnnouncementPdf(post, auctionMenus);

      let textContent = '';
      if (pdfUrl) {
        textContent = await extractPdfText(pdfUrl);
      }
      if (!textContent || textContent.trim().length < 50) {
        textContent = post.content;
      }

      const rec = parseAnnouncement(post.title, textContent, post.link, { isWykaz: isWyk });
      if (!rec) continue;

      if (rec.is_wykaz) {
        wykaz.push(rec);
      } else if (rec.kind === 'grunt') {
        land.push(rec);
      } else {
        listings.push(rec);
      }
    }

    console.error(
      `  grodzisk-mazowiecki: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz designation(s)`,
    );

    return {
      listings,
      wykaz,
      land,
      valid_empty: false,
      valid_empty_land: false,
    };
  })();

  return activePromise;
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

let resultsPromise = null;

export async function crawlResultDocs() {
  resultsPromise ??= (async () => {
    const known = await loadKnownSourceUrls('grodzisk-mazowiecki');
    const resultRefs = [];
    const seenPdfs = new Set();

    for (const mid of WGN_YEAR_MENUS) {
      let tree;
      try {
        tree = await fetchJson(`${BIP_ORIGIN}/api/menu/${mid}`);
      } catch (err) {
        console.error(`  grodzisk-mazowiecki: failed to fetch BIP menu ${mid}: ${err.message}`);
        continue;
      }

      // Find node matching mid
      function findNode(arr, id) {
        if (!Array.isArray(arr)) return null;
        for (const item of arr) {
          if (item.id == id) return item;
          if (item.children) {
            const f = findNode(item.children, id);
            if (f) return f;
          }
        }
        return null;
      }

      const wgnNode = findNode(tree, mid);
      if (!wgnNode || !Array.isArray(wgnNode.children)) continue;

      for (const auctionNode of wgnNode.children) {
        const name = auctionNode.name || '';
        // Skip non-real-estate auctions (cars, fire equipment)
        if (/samoch[oó]d|wozu|stra[żz]|ruchom|pojazd/i.test(name)) continue;

        let aData;
        try {
          aData = await fetchJson(`${BIP_ORIGIN}/api/menu/${auctionNode.id}/articles?limit=50`);
        } catch {
          continue;
        }

        const articles = Array.isArray(aData?.articles) ? aData.articles : [];
        for (const art of articles) {
          const link = art.link || '';
          if (!/wynik|rozstrzyg/i.test(link)) continue;

          let artDetails;
          try {
            artDetails = await fetchJson(`${BIP_ORIGIN}/api/articles/${art.id}`);
          } catch {
            continue;
          }

          const pdfAtt = (artDetails.attachments || []).find((a) => a.extension === 'pdf');
          if (!pdfAtt) {
            // If result has inline content instead of PDF
            if (artDetails.content) {
              const detailUrl = `${BIP_ORIGIN}/${link}`;
              if (!known.has(detailUrl)) {
                resultRefs.push({
                  text: artDetails.content,
                  pdf_url: null,
                  detail_url: detailUrl,
                  auction_date: null,
                });
              }
            }
            continue;
          }

          const pdfUrl = `${BIP_ORIGIN}/${pdfAtt.link}`;
          const detailUrl = `${BIP_ORIGIN}/${link}`;

          if (seenPdfs.has(pdfUrl) || known.has(pdfUrl) || known.has(detailUrl)) continue;
          seenPdfs.add(pdfUrl);

          const text = await extractPdfText(pdfUrl);
          if (!text) continue;

          resultRefs.push({
            text,
            pdf_url: pdfUrl,
            detail_url: detailUrl,
            auction_date: null,
          });
        }
      }
    }

    console.error(`  grodzisk-mazowiecki: crawled ${resultRefs.length} result doc(s)`);
    return resultRefs;
  })();

  return resultsPromise;
}
