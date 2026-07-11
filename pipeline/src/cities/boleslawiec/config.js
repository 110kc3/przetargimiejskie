// Bolesławiec (województwo dolnośląskie, powiat bolesławiecki, gmina miejska).
// The Prezydent Miasta Bolesławiec (Wydział MiG — Mienia i Gospodarki
// Nieruchomościami) auctions municipal flats, built-up plots and bare land via
// "ustny przetarg nieograniczony". See spikes/dolnoslaskie/powiat-boleslawiecki/boleslawiec.md
// — VERDICT: BUILD (Medium effort, LIVE-verified 2026-06-27).
//
// TWO-SOURCE architecture, both LIVE-verified 2026-07-11:
//   1. Announcements + wykaz — city portal xn--bolesawiec-e0b.pl (Joomla CMS).
//      The server-rendered HTML shell is a JS SPA (article list empty without
//      JS) BUT every Joomla category exposes an RSS feed
//      (`?format=feed&type=rss`) that IS server-rendered with full article
//      HTML (an image+field table for active "sp-estate" listings, prose for
//      "przetargi-planowane" wykaz entries) — no Playwright/render.js needed.
//      Boards: /index.php/mig/sp-estate/<kind> (active) and
//      /index.php/mig/przetargi-planowane/<kind> (wykaz), kind in
//      {lokale-mieszkalne, lokale-budynki-użytkowe, działki-mieszkaniowe,
//      działki-mieszkaniowe-2, działki-usługowe-przemysłowe, garaże, inne}.
//      "dzierżawy" (rental) boards exist but are out of scope.
//   2. Results — city BIP www.um.boleslawiec.bip-gov.pl (a distinct "bip-gov.pl"
//      platform, board `/public/?id=110553` "Wyniki sprzedaży nieruchomości").
//      Plain server-rendered HTML, one <a href="/public/getFile?id=N"> per
//      born-digital PDF result notice — no OCR needed. The board appears to
//      retain only recent results (the Joomla "Wyniki przetargów" boilerplate
//      states a 7-day-minimum retention policy), so this is a small rolling
//      window, not a full archive; that's expected, not a crawl bug.
//   Host ships an INCOMPLETE TLS chain (like bip.miastozabrze.pl) — both the
//   board HTML and the PDF downloads need `insecureTLS: true` (see crawl.js).
//
// `source: 'html'` — crawlResultDocs() extracts the PDF text itself (pdfText)
// and attaches it as ref.text; refresh.js's OCR/parse loop just reads ref.text.

export const config = {
  id: 'boleslawiec',
  // TERYT 0201011 — gmina miejska Bolesławiec (powiat bolesławiecki 0201, woj.
  // dolnośląskie 02), rodzaj 1 = gmina miejska. Confirm on first geoportal run.
  teryt: '020101_1',
  label: 'Bolesławiec',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Bolesławiec (Wydział Mienia i Gospodarki Nieruchomościami)',
  host: 'xn--bolesawiec-e0b.pl',
  source: 'html',
};
