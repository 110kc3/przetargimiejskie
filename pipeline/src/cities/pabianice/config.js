// Pabianice — Gmina Miejska Pabianice (powiat pabianicki, łódzkie).
// Auctions residential flats (lokale mieszkalne) via przetarg ustny nieograniczony.
// Source: city BIP on Logonet CMS 2.9.0 — bip.um.pabianice.pl
// Spike verified: 2026-06-27. See spikes/lodzkie/powiat-pabianicki/pabianice.md.
//
// The list board (/przetargi-nieruchomosci/{page}/{perPage}) is a clean
// server-rendered HTML page. Every entry is a standalone <table> block whose rows
// carry the key fields inline:
//   Adres nieruchomości  → detail URL + address text
//   Typ przetargu        → "Przetarg ustny nieograniczony" (filter key)
//   Rodzaj nieruchomości → "lokal mieszkalny" / "lokal użytkowy" / …  (filter key)
//   Cena wywoławcza      → "53.000 zł"
//   Data przetargu       → "14.05.2026 godz. 09:40"
//
// Result notices (rozstrzygnięcie) are PDF attachments on the detail page.
// Achieved price is in the result PDF body, NOT in the HTML.
//
// Adapter scope: lokal mieszkalny + przetarg ustny nieograniczony only.
//   • "lokal użytkowy" — commercial, out of scope
//   • "nieruchomość niezabudowana / zabudowana" — land/house, out of scope
//   • "przetarg pisemny nieograniczony" — written tender; spike verdict: include or
//     exclude on first live run depending on volume. Conservative start: exclude.

export const config = {
  id: 'pabianice',
  // TERYT for gmina miejska Pabianice (powiat pabianicki 1012, gmina-type 1).
  // Derived from pattern: łódzkie voivodeship TERYT prefix 10, powiat pabianicki
  // 12, gmina 1, type 1 → 101201_1. CONFIRM on first geoportal run against
  // https://uldk.gugik.gov.pl/?request=GetParcelById&id=<parcel>&result=teryt
  teryt: '101201_1',
  label: 'Pabianice',
  voivodeship: 'lodzkie',
  authority: 'Gmina Miejska Pabianice',
  host: 'bip.um.pabianice.pl',
  source: 'html',
};
