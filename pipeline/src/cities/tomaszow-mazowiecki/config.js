// Tomaszów Mazowiecki (łódzkie, powiat tomaszowski — seat) — Prezydent Miasta
// Tomaszowa Mazowieckiego (Wydział Gospodarki Nieruchomościami, WGN) auctions
// municipal flats, houses/commercial units and land parcels via classic
// *ustny przetarg nieograniczony* on the city's custom PHP BIP,
// bip.tomaszow.miasta.pl (server-rendered HTML, CMS "wersja 3.0.43", no JS).
// See spikes/lodzkie/powiat-tomaszowski/tomaszow-mazowiecki.md (VERDICT:
// BUILD, 2026-06-27). TTBS (Tomaszowskie Towarzystwo Budownictwa Społecznego,
// bip.ttbs.com.pl) handles RENTAL stock only — out of scope.
//
// LIVE-VERIFIED 2026-07-19 (this build):
//   - Boards (bip.tomaszow.miasta.pl/public/?id=NNNNNN):
//       id=144386  "Zbycie - Aktualne ogłoszenia o przetargach"  (announcements)
//       id=148898  "Informacje Prezydenta Miasta o rozstrzygniętych
//                    przetargach"                                (results — achieved-price stream)
//     Both server-render a flat `<li class="element_podkategorii">` list —
//     see crawl.js.
//   - The spike's "session-redirect" concern (cookie-less ?id= deep links
//     redirecting to the homepage, observed against id=153642/148898/175624
//     on 2026-06-27) did NOT reproduce on repeated re-fetch this build (every
//     board/item id= loaded its real content on a bare, cookie-less request,
//     multiple times, including a fresh curl process per request — no shared
//     session). A defensive session-establish-and-retry fallback (same
//     cookie-jar idiom as brzeg/crawl.js's waiting-room retry) is kept in
//     crawl.js in case the quirk resurfaces for a different caller IP (e.g.
//     the GH Actions runner), but it is NOT expected to fire in normal
//     operation — see crawl.js header.
//   - The announcements board's items are themselves SUB-PAGES (`?id=` link,
//     `class="nazwa_pliku nourl"`), each listing several PDF attachments
//     (mapa, regulamin, oświadczenia, AND the real "Ogłoszenie o przetargu
//     ...pdf") — the real announcement text lives in that one PDF, picked by
//     filename (see crawl.js pickAnnouncementFile). This is NOT what the
//     spike assumed ("announcements are inline HTML body text") — the spike
//     was wrong on this point; verified live before cloning per dispatch
//     instructions.
//   - The results board's items link DIRECTLY to a PDF or DOCX per row (no
//     sub-page) — "Informacja [Prezydenta Miasta] o wynikach/rozstrzygnięciu
//     ... przetargu" — born-digital text (pdftotext) or OOXML .docx
//     (unzip/docText), both handled by extractText() in crawl.js.
//   - Current live announcements (2026-07-19) are all LAND parcels (ul.
//     Zielona 38-40, Środkowa 3, Spalska 42) — the flat-sale stream is real
//     but intermittent (confirmed historically: Plac Kościuszki 23 lokal
//     mieszkalny nr 9, SOLD 2022-08-19 at 35 350 zł vs 35 000 zł wywoławcza).
//     classifyKind + parse.js handle mieszkalny/zabudowana/uzytkowy/garaz/
//     grunt uniformly; land records are partitioned into land.json by
//     refresh.js exactly as for every other city.
//   - The "Aktualne wykazy nieruchomości" board (id=153642) is deliberately
//     OUT OF SCOPE this build: live inspection found it mixes stale
//     (2020/2023) leftover entries, *bezprzetargowa* (tenant-buyout, never an
//     open auction) designations and an *aport* (in-kind contribution, not a
//     cash sale) wykaz — none of which are the load-bearing open-auction +
//     achieved-price stream the spike verdict rests on. crawlActive() always
//     returns `wykaz: []` (same scope decision as kalisz's `land: []`, see
//     kalisz/config.js).
//
// `source: 'html'` — crawl.js extracts each attachment's text itself
// (pdfText/docText) and hands refresh.js the ready text via `ref.text`.

export const config = {
  id: 'tomaszow-mazowiecki',
  // TERYT for Gmina Miasto Tomaszów Mazowiecki (gmina miejska, powiat
  // tomaszowski [10 17], woj. łódzkie [10]) — provisional from GUS registry
  // numbering, NOT fetched live. Confirm on first geoportal run.
  teryt: '101701_1',
  label: 'Tomaszów Mazowiecki',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Tomaszowa Mazowieckiego (Wydział Gospodarki Nieruchomościami)',
  host: 'bip.tomaszow.miasta.pl',
  source: 'html',
};
