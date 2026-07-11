// Wschowa — Lubuskie, powiat wschowski, gmina miejsko-wiejska.
// Municipal property sales (incl. lokale mieszkalne) are run by the Wydział
// Gospodarki Miejskiej i Ochrony Środowiska (Urząd Miasta i Gminy Wschowa,
// Rynek 1) and published on the city BIP (bip.gminawschowa.pl), which runs
// the SYSTEMDOBIP.PL (E-LINE Systemy Internetowe) CMS — the SAME engine
// family as gorzow-wielkopolski and miedzyrzecz (identical `<tr class="odd|
// even">` row shape, td-date-1/td-date-2/td-title-1/td-title-2/td-attachments-1
// classes; footer credits "SYSTEMDOBIP.PL ... E-LINE SYSTEMY INTERNETOWE
// Tadeusz Kozłowski" — confirmed live 2026-07-11).
//
// Board: https://bip.gminawschowa.pl/przetargi/29/status/{0,1,2}/
//   0 = Ogłoszone (active)        — crawlActive()
//   1 = Rozstrzygnięte (resolved) — crawlResultDocs()
//   2 = Unieważnione (cancelled)  — NOT crawled (matches gorzow/miedzyrzecz's
//       own convention of excluding "unieważnione" from the data entirely)
//
// SHAPE MATCHES MIĘDZYRZECZ, NOT GORZÓW: the board is INLINE-COLUMN (one
// table doubles as both the announcement AND the results engine — a row
// already carries "Cena wywoławcza" + "Wynik" — Pozytywny/Negatywny/Brak
// wyniku — inline), not Gorzów's separate batch-PDF-per-announcement engine.
// See crawl.js/parse.js for the one Wschowa-specific wrinkle both analogs
// don't have: a single row can BUNDLE several lots (flats and/or land
// parcels) inside one "Cena wywoławcza" cell as a numbered list.
//
// A separate "Wykaz dot. nieruchomości" board exists on the same BIP
// (https://bip.gminawschowa.pl/10105/Wykaz_dot__nieruchomosci/) — confirmed
// live but NOT crawled here (out of scope for this build, same spirit as
// miedzyrzecz's MTBS note); wykaz stays [] like every SystemDoBIP sibling.
//
// Do NOT confuse with bip.wschowa.info — that is the Powiat Wschowski
// (Starostwo), a separate JST; out of scope.
//
// See spike: spikes/lubuskie/powiat-wschowski/wschowa.md

export const config = {
  id: 'wschowa',
  // Gmina Wschowa (gmina miejsko-wiejska), powiat wschowski, woj. lubuskie.
  // WOJ 08 + POW 12 (powiat wschowski) + GMINA 03 (Wschowa) + RODZAJ 3
  // (gmina miejsko-wiejska) = 0812033. Cross-checked live against multiple
  // independent TERYT lookups (wykaz.rky.pl/g0812033.html, geoportal2.pl/pl/
  // teryt/081203, e-mapa.net/polska/lubuskie-08/wschowski-12/wschowa-03-3/)
  // on 2026-07-11 — higher confidence than a blind-recollection placeholder,
  // but still not cross-checked against a live ULDK parcel query from this
  // sandbox. Confirm on first geoportal run.
  teryt: '0812033',
  label: 'Wschowa',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miasta i Gminy Wschowa',
  host: 'bip.gminawschowa.pl',
  source: 'html',
};
