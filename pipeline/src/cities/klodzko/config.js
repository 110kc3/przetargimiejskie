// Kłodzko (Dolnośląskie, powiat kłodzki) — Gmina Miejska Kłodzko.
//
// Urząd Miasta w Kłodzku publishes both sale announcements AND result notices
// (with achieved price "Cena nabycia") in the same BIP category (menu=346) at
// um.bip.klodzko.pl. The CMS is a custom PHP system (url pattern:
// index.php?n=i&id=NNN&akcja=info&menu=346).
//
// Volume: ~5–10 flat auctions/year (LOW-MODERATE).
// Source: plain server-rendered HTML, no auth, no OCR needed.
// Closest analog: Bytom (single BIP, both streams in one category, low volume).
//
// Result notice title signature: "INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU"
// Announcement title signature: "przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego"
//
// TERYT: 0207011 (gmina miejska Kłodzko; confirm on first geoportal run).
// The TERYT for powiat kłodzki is 0207; the gmina TERYT for Kłodzko miasto
// is 0207011. Validate via ULDK on first live refresh.

export const config = {
  id: 'klodzko',
  teryt: '0207011', // gmina miejska Kłodzko — confirm on first geoportal run
  label: 'Kłodzko',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miasta w Kłodzku',
  host: 'um.bip.klodzko.pl',
  source: 'html', // crawlResultDocs returns refs with .text already set
};
