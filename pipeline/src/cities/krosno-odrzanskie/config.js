// Krosno Odrzańskie — Lubuskie, powiat krośnieński (gmina miejsko-wiejska).
// Municipal property sales (incl. lokale mieszkalne) are run by the Wydział
// Gospodarki Nieruchomościami, Ochrony Środowiska i Rolnictwa of the Urząd
// Miasta w Krośnie Odrzańskim (ul. Parkowa 1) and published on the city BIP
// (bip.krosnoodrzanskie.pl), which runs the SYSTEMDOBIP.PL (E-LINE Systemy
// Internetowe) CMS — the SAME engine family as wschowa, strzelce-krajenskie,
// gorzow-wielkopolski and miedzyrzecz (identical `<tr class="odd|even">` row
// shape, td-date-1/td-date-2/td-title-1/td-title-2/td-attachments-1 classes;
// footer credits "SYSTEMDOBIP.PL ... E-LINE" — confirmed live 2026-07-12).
//
// Board: https://bip.krosnoodrzanskie.pl/przetargi/202/status/{0,1,2}/
//   0 = Ogłoszone (active)        — crawlActive()
//   1 = Rozstrzygnięte (resolved) — crawlResultDocs()
//   2 = Unieważnione (cancelled)  — NOT crawled (same convention as the
//       wschowa/strzelce/gorzow/miedzyrzecz siblings)
//
// CLOSEST ANALOG = WSCHOWA (see parse.js/crawl.js headers). Like wschowa, the
// board row already carries a REAL inline "Cena wywoławcza" (e.g. "220 000,00
// zł", not strzelce's "informacja w załączniku" placeholder) AND a populated
// "Wynik" cell ("Pozytywny"/"Negatywny"/"Brak wyniku"), and result notices are
// "Informacja o wyniku przetargu" attachments hanging off the resolved row —
// so wschowa's Wynik-gated result flow fits exactly. The krosno-specific
// wrinkles wschowa doesn't have: (a) auction ROUND is a Polish WORD ordinal
// ("pierwszy"/"drugi"/"trzeci"/"czwarty" przetarg), not a Roman numeral;
// (b) the flat AREA and the canonical full street name live only in the
// born-digital announcement / wynik PDF body, not on the board row (the row's
// "Dotyczy" title carries an ABBREVIATED address like "ul. B.Chrobrego 26/3"),
// so both flows fetch that PDF (core/pdf-text.js) to key on a canonical
// address + recover the area; (c) a real source MISLABEL — one flat's wynik
// PDF calls it "lokal użytkowy nr 3" though the board + announcement both say
// "lokal mieszkalny" (78,19 m² match) — defeated by anchoring classifyKind on
// the board "Dotyczy" title, not the PDF body (see parse.js buildResultText).
//
// SCOPE: this build tracks FLATS (lokal mieszkalny) only — same focus as the
// spike (residential flat auctions). Land/commercial rows are recognised and
// deliberately skipped; wykaz:[] and land:[] like the SystemDoBIP siblings.
//
// See spike: spikes/lubuskie/powiat-krosnienski/krosno-odrzanskie.md

export const config = {
  id: 'krosno-odrzanskie',
  // Gmina miejsko-wiejska Krosno Odrzańskie, powiat krośnieński, woj. lubuskie.
  // WOJ 08 + POW 02 (krośnieński) + GMINA 06 + RODZAJ 3 (gmina miejsko-wiejska,
  // whole) = 080206_3. The 08-02-06 prefix is cross-checked HIGH-confidence
  // against two independent TERYT registries (wykaz.rky.pl/g0802065.html — the
  // obszar-wiejski split 0802065; geoportal2.pl/pl/g/lubuskie/krosnienski/
  // krosno-odrzanskie/) on 2026-07-12. Note for a future land build: town
  // parcels (obręb 0001, where the flats sit) resolve under RODZAJ 4 (080206_4)
  // and rural parcels under RODZAJ 5 (080206_5) in a ULDK query — confirm the
  // exact rodzaj on first geoportal run. Flats are address-keyed, so teryt is
  // informational here (no ULDK parcel lookup happens for a lokal mieszkalny).
  teryt: '080206_3',
  label: 'Krosno Odrzańskie',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miasta w Krośnie Odrzańskim',
  host: 'bip.krosnoodrzanskie.pl',
  source: 'html',
};
