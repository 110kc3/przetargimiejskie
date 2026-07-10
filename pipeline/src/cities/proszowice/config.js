// Proszowice (województwo małopolskie, powiat proszowicki) — Gmina i Miasto
// Proszowice (Burmistrz Gminy i Miasta Proszowice) auctions municipal flats
// (recurring — several units in blocks at ul. Królewska) and undeveloped /
// built land plots (Wolwanowice, Klimontów, Bobin, Kościelec, Żębocin, Ostrów,
// and in-town Proszowice parcels), and publishes the achieved-price / negative
// -outcome result notices on the SAME board. See
// spikes/malopolskie/powiat-proszowicki/proszowice.md.
//
// Shape (closest analog: bochnia/olkusz — small Małopolska city portal,
// server-rendered HTML, no PDF/OCR, full legal text inline). Proszowice runs a
// bespoke ASP CMS (`asp/pl_start.asp?typ=...&menu=...`) with a friendly-URL
// rewrite (`aktualnosc-NNNN-slug.html`); the relevant board is the "Nieruchomości
// gminne" news category, `aktualnosci-25-nieruchomosci_gminne.html`.
//
// KEY DEVIATIONS from the bochnia/olkusz/finn-bip vocabulary (see parse.js
// header for the full list + why each matters):
//   - the operative sale verb is "zbycie" (dispose/transfer), NEVER "sprzedaż"
//     — a gate that requires "sprzeda" (as bochnia/olkusz/finn-bip all do)
//     silently admits ZERO Proszowice announcements.
//   - round ordinals go up to at least IX (dziewiąty) spelled out in Polish
//     words, never as Roman numerals — finn-bip's roundFromTitle only covers
//     pierwszy..piąty (1-5) + Roman numerals, so rounds VI-IX undercount to 1.
//   - the newer (2026) result-notice template renders an address/price TABLE
//     whose flattened text can trick a generic "cena wywoławcza ... zł" scan
//     into bridging across a KW/parcel number's trailing digit into the real
//     amount (a real bug found + fixed here — see startingPriceFromText).
//
// Pagination: the friendly category URL's own "next page" links
// (`/aktualnosci-lista-strona-N.html`) silently DROP the category filter
// (verified live: they fall back to the full unfiltered ~2500-item archive).
// The category filter survives ONLY via a `?page=N` query string appended to
// the ORIGINAL friendly URL (`aktualnosci-25-nieruchomosci_gminne.html?page=2`)
// — verified live 2026-07-10 across pages 1-15 (page 15 repeats page 14 verbatim,
// confirming 14 is the true last page at that time). See crawl.js.
//
// `source: 'html'` — the adapter extracts inline article text itself; no PDF/OCR.
//
// NOTE (confirm on first CI refresh): the board harvest + pagination were
// verified live 2026-07-10; the body parsers are groundtruthed against real
// live bodies (see parse.js + tests/parse-proszowice.test.js).

export const config = {
  id: 'proszowice',
  // UNVERIFIED best-effort TERYT (LOW confidence) — woj. małopolskie (12),
  // powiat proszowicki believed to be "11", gmina miejsko-wiejska Proszowice
  // believed to be the seat gmina "01" (rodzaj 4 = miejsko-wiejska), by analogy
  // with bochnia/chrzanow's "seat gmina = 01 in its own powiat" pattern — NOT
  // cross-checked against a TERYT registry. Confirm on first geoportal run.
  teryt: '121101_4',
  label: 'Proszowice',
  voivodeship: 'malopolskie',
  authority: 'Urząd Gminy i Miasta Proszowice',
  host: 'proszowice.pl',
  source: 'html',
};
