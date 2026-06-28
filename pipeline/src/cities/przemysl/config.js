// Przemyśl — miasto na prawach powiatu, województwo podkarpackie.
//
// Municipal flat auctions ("przetarg ustny nieograniczony na sprzedaż lokalu
// mieszkalnego") are published by Prezydent Miasta Przemyśla. Two complementary
// pages on the same BIP CMS (skyCMS v4):
//
//   ANNOUNCEMENTS: invest.przemysl.eu/40004/642/przetargi-na-zbycie-...
//     — article list, paginated ?Page=N, mixed types (flats, land, buildings).
//     Filter by title keyword "lokal mieszkalny". Each entry links to the detail
//     article (same CMS, numeric ID + slug, server-rendered HTML).
//
//   RESULTS: bip.przemysl.pl/59228/3722/informacje-o-wynikach-przetargow.html
//     — article list, paginated ?Page=N, mixed types. Filter titles for "lokal
//     mieszkalny" or "lokalu mieszkalnego". Detail article carries achieved price
//     inline in body text ("Najwyższa cena osiągnięta w przetargu wyniosła …").
//
// Both lists share the same skyCMS markup:
//   <li><h2><a href="https://bip.przemysl.pl/NNNNN/slug.html">TITLE</a></h2></li>
//
// No auth, no bot block, no JS required (server-rendered HTML).
// Closest analog: Bytom (single-BIP host, mixed stream, server HTML, numeric IDs).
//
// NOTE: teryt confirmed via GUS + TERYT browser:
//   Przemyśl grodzki (powiat m. Przemyśl) = 1861 (powiat) → gmina 186101_1.
//   TERYT code confirm on first geoportal run.

export const config = {
  id: 'przemysl',
  teryt: '186101_1', // gmina miejska Przemyśl (powiat grodzki) — confirm on first geoportal run
  label: 'Przemyśl',
  voivodeship: 'podkarpackie',
  authority: 'Urząd Miasta Przemyśla',
  host: 'bip.przemysl.pl',
  source: 'html',
};
