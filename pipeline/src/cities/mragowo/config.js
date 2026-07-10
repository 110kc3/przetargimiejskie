// Mrągowo (województwo warmińsko-mazurskie, powiat mrągowski) — Gmina Miasto
// Mrągowo (Burmistrz) auctions municipal flats (lokale mieszkalne) and land
// (nieruchomości gruntowe) via przetarg ustny nieograniczony/ograniczony,
// publishing both sale announcements and achieved-price "informacja o wyniku
// przetargu" result notices directly on its city BIP.
// See spikes/warminsko-mazurskie/powiat-mragowski/mragowo.md.
//
// CMS: Warmińsko-Mazurskie Centrum Nowych Technologii (CNT) regional BIP —
// the SAME platform as Olsztyn (bip.olsztyn.eu, see cities/olsztyn/), NOT
// Braniewo. The mragowo spike named Braniewo as the "closest analog", but the
// BUILT braniewo adapter (bip.braniewo.pl) is actually a Logonet eUrząd site —
// a different CMS entirely (XML board feed + PDF attachments). Olsztyn is the
// true mechanical template: confirmed live, identical `<tr data-key="ID">`
// index-table markup, `/kategoria/NNN/...` board URLs, `/ID/slug.html`
// article URLs, `<article class="post">` body, and the "© Warmińsko-Mazurskie
// Centrum Nowych Technologii" footer credit (verified 2026-07-10).
//
//   BOARD (current):  https://bipmragowo.warmia.mazury.pl/kategoria/1050/gospodarka-nieruchomosciami.html
//   BOARD (archive):  same URL + ?VInformacjaSearch[archiwum]=1 — a MUCH
//                      bigger listing (~1,800 records vs ~76 current; see the
//                      bounded page caps in crawl.js) that most result
//                      notices move into once their short "podano do
//                      publicznej wiadomości" display window closes.
//   ARTICLE:           https://bipmragowo.warmia.mazury.pl/{id}/{slug}.html
//
// Server-rendered HTML, no SPA, no auth, no PDF gate — every notice (sale
// announcement AND result) is inline HTML prose in the article's post-body.
//
//   ANNOUNCEMENT: "BURMISTRZ MIASTA MRĄGOWA ogłasza pierwszy przetarg ustny
//     nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 5 położonego
//     w budynku przy ul. Mrongowiusza 31 w Mrągowie ... Cena wywoławcza
//     nieruchomości lokalowej wynosi 210.000 zł ... PRZETARG ODBĘDZIE SIĘ W
//     DNIU 8 stycznia 2026 r."
//   RESULT: "INFORMACJA O WYNIKU PRZETARGU ... został przeprowadzony pierwszy
//     przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 ...
//     Cena wywoławcza nieruchomości wynosiła 210.000 zł ... Najwyższa cena
//     osiągnięta w przetargu: N złotych. Nabywcą nieruchomości został: NAME."
//     (sold) or "Z powodu braku uczestników/oferentów ..., przetarg zakończył
//     się wynikiem negatywnym." (unsold — the reason clause varies, the
//     closing "przetarg zakończył się wynikiem negatywnym" does not).
//
// Volume: low-modest — a handful of distinct flats/year, each cycling through
// I-IV rounds with a stepped-down cena wywoławcza (e.g. Mrongowiusza 31/5:
// 210 000 -> 160 000 zł across rounds I/III, both unsold). Land (grunt)
// auctions are far more numerous on the same board and must be routed by
// kind; a large volume of "wykaz ... w drodze bezprzetargowej na rzecz
// najemcy" rows (direct sale to sitting tenant, NOT an open auction) is noise
// to filter out.
//
// `source: 'html'` — the adapter extracts the article body text itself
// (stripTags), so crawlResultDocs() returns refs that already carry `.text`.

export const config = {
  id: 'mragowo',
  // gmina miejska Mrągowo, powiat mrągowski, woj. warmińsko-mazurskie (28).
  // Ziemski-powiat numbering in this voivodeship is not independently
  // verified here (only inferred from braniewo's committed '2802' = powiat
  // braniewski) — confirm on first geoportal run before trusting this for
  // parcel deep-links.
  teryt: '281201_1',
  label: 'Mrągowo',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Gmina Miasto Mrągowo',
  host: 'bipmragowo.warmia.mazury.pl',
  source: 'html',
};
