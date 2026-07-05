// Bełchatów (Łódzkie, powiat bełchatowski) — municipal flat sales run directly
// by Urząd Miasta Bełchatowa, Wydział Geodezji i Gospodarki Przestrzennej
// (ul. Kościuszki 1, pokój 408, tel. 44 733 51 78). No ZGM / housing company —
// the city hall auctions flats itself by *ustny przetarg nieograniczony*.
//
// Source: belchatow.pl — WordPress (Newspaper by tagDiv), server-rendered, no
// auth wall, no SPA. We read it through the WordPress REST API
// (belchatow.pl/wp-json/wp/v2), which returns clean JSON for every post and is
// far more stable than scraping the tagDiv category loop (that loop is
// AJAX-hydrated and renders "Brak postów" server-side when a category is idle).
//
// Where the flat data actually lives (profiled 2026-07-05):
//   - Category 219 "Przetargi" → 220 "Mieszkania" / 221 "Nieruchomości":
//     FORMAL announcement STUBS. Body is one sentence + a deep link to
//     belchatow.bip.gov.pl and a downloadable PDF — NO address/area/price in
//     the post body. Category 220 (mieszkania) is the canonical flat channel
//     but is empty between auctions (this city runs ~1–2 flat auctions/year).
//   - Category 215 "Aktualności" (news): friendly write-ups published alongside
//     each auction that DO carry machine-readable fields — powierzchnia
//     ("52,83 mkw"), cena wywoławcza ("276 724,00 zł"), auction date ("Przetarg
//     odbędzie się 30 czerwca"), address ("os. Dolnośląskim 225" / "bloku nr
//     306"). These prose posts are the parseable listing source.
//
// crawlActive: REST search + category 220, filtered to flat-SALE announcements
//   (must carry "cena wywoławcza"; wykup-komunalne / najem / dzierżawa / działki
//   / lokale użytkowe excluded), parsed from the prose body.
// crawlResultDocs: searches the same site for "informacja o wyniku …" flat
//   result posts. None are published on belchatow.pl today (achieved-price
//   notices live only on belchatow.bip.gov.pl); the crawler + parseResultDoc are
//   wired against the standard Polish result template and return [] until a
//   result post appears. See parse.js.
//
// `source: 'html'` — everything is server-rendered HTML/JSON; no OCR.

export const config = {
  id: 'belchatow',
  // TERYT gmina miejska Bełchatów (powiat bełchatowski, łódzkie).
  // Code 100101_1 — confirm on first geoportal run.
  teryt: '100101_1',
  label: 'Bełchatów',
  voivodeship: 'lodzkie',
  authority: 'Urząd Miasta Bełchatowa',
  host: 'belchatow.pl',
  source: 'html',
};
