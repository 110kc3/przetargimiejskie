// Góra — Dolnośląskie, powiat górowski, gmina miejsko-wiejska.
// Urząd Miasta i Gminy w Górze (Burmistrz Góry, ul. Adama Mickiewicza 1,
// 56-200 Góra) sells municipal flats (lokale mieszkalne) by ustny przetarg
// nieograniczony (I → II przetarg → rokowania when no bidder appears).
// Published on the city BIP (bip.gora.com.pl), a 2ClickPortal engine.
//
// Two boards, BOTH fully server-rendered with a browser UA (NO JS gate — the
// spike flagged the announcements board as JS-rendered, but a plain GET with a
// browser User-Agent returns the full article/file list for BOTH boards, so no
// core/render.js / needsRender is used — confirmed live 2026-07-21):
//   /wyniki-przetargow.html  — RESULTS (achieved prices) — crawlResultDocs()
//   /233-przetargi.html      — ANNOUNCEMENTS (active listings) — crawlActive()
// Each board is one big page listing DOCX/PDF attachments under
// files/file_add/download/<id>_<slug>.<ext>. Flats are picked by the slug
// (classifyKind on the dash-decoded slug → 'mieszkalny'); the achieved price /
// area / dates live INSIDE the DOCX/PDF (docText for .doc/.docx, pdfText for
// born-digital .pdf — no OCR needed on this host).
//
// Structural analog: glubczyce (two big attachment-listing boards, harvest
// links, docText/pdfText, route ann vs result; source:'html').
//
// See spike: spikes/dolnoslaskie/powiat-gorowski/gora.md

export const config = {
  id: 'gora',
  // Gmina Góra (gmina miejsko-wiejska), powiat górowski, woj. dolnośląskie.
  // WOJ 02 + POW 05 (powiat górowski) + GMINA 01 (Góra) + RODZAJ 3 (miejsko-
  // wiejska) = 0205013. Placeholder from TERYT structure — NOT cross-checked
  // against a live ULDK/geoportal parcel query from this sandbox. Confirm on
  // first geoportal run.
  teryt: '0205013',
  label: 'Góra',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miasta i Gminy w Górze',
  host: 'bip.gora.com.pl',
  source: 'html',
};
