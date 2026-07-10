// Poddębice (Łódzkie, powiat poddębicki) — Gmina Poddębice (gmina
// miejsko-wiejska; Burmistrz Poddębic / Urząd Miejski w Poddębicach, Referat
// Gospodarki Nieruchomościami i Urbanistyki). Auctions municipal flats (lokale
// mieszkalne) and land (nieruchomości gruntowe, incl. built plots with no
// street address sold as a whole) via przetarg ustny nieograniczony/
// ograniczony directly through the city BIP.
//
// Platform: devcomm "bipv45" — a single mixed board ("Ogłoszenia Burmistrza
// Poddębic", id=102, ~279 docs: property auctions + wykazy + MPZP-planning
// noise, all together) exposed as a DataTables-JSON list endpoint
// (&akcja=pobierz_dokumenty_ajax, one call returns every row — no pagination)
// plus a server-rendered detail page whose only real content is a link to a
// born-digital text-PDF (pdftotext works cleanly, no OCR needed). No auth, no
// SPA, no bot-block (confirmed live with the plain bot UA), valid TLS chain
// (insecureTLS NOT needed).
//
// MARGINAL/thin build: recurring but sparse and bursty flat auctions (2/yr
// 2019-2021, a 2022-2025 gap while flats moved to sitting tenants via
// bezprzetargowo wykaz, resumed 2026), land-dominated volume, and crucially
// NO achieved-price/result stream exists on this board — zero "informacja o
// wyniku przetargu" / "rozstrzygnięcie" notices across all 279 entries
// (confirmed live 2026-07-10). crawlResultDocs() therefore returns [] by
// design, not a bug; parseResultDoc is implemented defensively (untested
// against real Poddębice data — no example exists — but follows the same
// standard Rozporządzenie RM z 14.09.2004 template Poddębice's own
// announcement PDFs cite, same as tczew/naklo-nad-notecia). The value here is
// the currently-active open flat + land auctions.
//
// See spikes/lodzkie/powiat-poddebicki/poddebice.md.

export const config = {
  id: 'poddebice',
  // TERYT for Gmina Poddębice (gmina miejsko-wiejska, powiat poddębicki, woj.
  // łódzkie). VERIFIED (not the usual "provisional" guess) via live GUS TERC
  // lookup 2026-07-10: powiat poddębicki TERC=1011
  // (pl.wikipedia.org/wiki/Powiat_poddębicki), gmina Poddębice TERC=1011033
  // (pl.wikipedia.org/wiki/Poddębice_(gmina)) → woj=10, powiat=11, gmina=03,
  // rodzaj=3 (miejsko-wiejska, whole-gmina unit — same convention as
  // pajeczno's 100904_3, not split into miasto/obszar-wiejski parts like
  // naklo-nad-notecia's _4). Still confirm on first geoportal parcel-lookup
  // run per convention.
  teryt: '101103_3',
  label: 'Poddębice',
  voivodeship: 'lodzkie',
  authority: 'Urząd Miejski w Poddębicach',
  host: 'bip.poddebice.pl',
  // Result PDFs (if any ever appear) are born-digital text — pdftotext, no
  // OCR. refresh.js dispatches crawlResultDocs refs shaped {pdf_url,
  // auction_date} through pdfText() itself (see katowice for the same
  // pattern) — crawl.js does not need to self-extract.
  source: 'pdf-text',
};
