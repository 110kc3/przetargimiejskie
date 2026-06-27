// Toruń — municipal property sales published on the city BIP (bip.torun.pl).
//
// Toruń (Gmina Miasta Toruń) runs a steady stream of oral open auctions
// (*przetarg ustny nieograniczony*) for residential flats and other property
// types. All records are published on the city BIP, which provides:
//   - A native XML export at /przetargi-nieruchomosci/xml/{page}/{per_page}
//     listing ALL auction records with address, rodzaj, price and date.
//   - Individual detail pages at /przetarg-nieruchomosci/{id}/{slug} carrying
//     a structured metadata table and attachment links.
//   - Result notices as .docx attachments (~15 kB) labelled "info o wyniku
//     przetargu {date}r." — each gives a table of auction outcomes including
//     achieved price (Cena wylicytowana) and buyer (Nabywca).
//
// Closest analogue: Zabrze (HTML + result-doc stream). Toruń is simpler because
// the XML endpoint replaces HTML list scraping.
//
// Source: 'html' — crawlResultDocs() returns refs already carrying .text (we
// download + unpack the DOCX inline), so the refresh loop's OCR/pdf dispatch
// is bypassed. parseResultDoc() is wired to the result-doc stream.
//
// TERYT: Toruń is a city-county (miasto na prawach powiatu) in the
// kujawsko-pomorskie voivodeship. The TERYT code below is for the gmina
// (city). NOTE: confirm on first geoportal run.

export const config = {
  id: 'torun',
  teryt: '046101_1', // Toruń grodzki (miasto na prawach powiatu) — confirm on first geoportal run
  label: 'Toruń',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Gmina Miasta Toruń',
  host: 'bip.torun.pl',
  source: 'html',
};
