// Bochnia (województwo małopolskie, powiat bocheński) — Gmina Miasta Bochnia
// (Urząd Miasta, Wydział Gospodarki Mieniem Komunalnym i Rolnictwa — GMiR)
// directly conducts and publishes "przetarg ustny nieograniczony na sprzedaż"
// for municipal flats AND undeveloped land, and also publishes the achieved-price
// result notices. Both streams are plain WordPress HTML posts on bochnia.eu.
// See spikes/malopolskie/powiat-bochenski/bochnia.md.
//
// Shape (closest analog: trzebinia — small Małopolska city, Burmistrz publishes
// both announcements and "Informacja o wyniku przetargu" notices on its own CMS,
// full legal text inline, no PDF/OCR). The source is the WordPress category
// archive "Komunikaty i ogłoszenia" (107 paginated pages, MIXED — auctions,
// results, ostrzeżenia, wykazy, konkursy), so items are kept/dropped by TITLE.
// The standard Polish auction vocabulary means core/finn-bip.js body helpers
// apply; the Bochnia deviations (result date "z dnia …" anchored after
// "o wyniku"; achieved price "Wylicytowana cena … wyniosła …"; office street
// "Kazimierza Wielkiego") live in parse.js.
//
//   ARCHIVE: https://bochnia.eu/kategorie/komunikaty-i-ogloszenia/  (+ /page/N/)
//   POST:    https://bochnia.eu/<slug>/   (server-rendered HTML, full body)
//
// OUT OF SCOPE: dzierżawa/najem (title-filtered); the bip.malopolska.pl/umbochnia
// mirror is a JS SPA that returns empty HTML — must NOT be used for this city.
//
// `source: 'html'` — the adapter fetches article HTML and extracts text itself.
//
// NOTE (confirm on first CI refresh): the WordPress category harvest + pagination
// depth were inferred from the live archive; the body parsers are groundtruthed
// against three REAL live bodies (verified 2026-07-05): flat announcement
// (Murowianka 1/1, II przetarg, 136 800 zł, 2024-01-12); flat result NEGATIVE
// (Floris 3/2, brak oferentów); land result SOLD (Smyków 1258/42, wywoławcza
// 188 000 → wylicytowana 189 900, 2026-04-13).

export const config = {
  id: 'bochnia',
  teryt: '120101_1', // gmina miejska Bochnia (powiat bocheński) — confirm on first geoportal run
  label: 'Bochnia',
  voivodeship: 'malopolskie',
  authority: 'Urząd Miasta Bochnia',
  host: 'bochnia.eu',
  source: 'html',
};
