// Braniewo (województwo warmińsko-mazurskie, powiat braniewski) — the Gmina
// Miasta Braniewa (Burmistrz) auctions municipal flats (lokale mieszkalne,
// including spółdzielcze własnościowe prawo do lokalu) and land, publishing BOTH
// sale announcements and achieved-price result notices directly on its city BIP.
// See spikes/warminsko-mazurskie/powiat-braniewski/braniewo.md.
//
// Shape (closest analog: Tarnowskie Góry — SAME CMS VENDOR, Logonet eUrząd, but
// an OLDER server-rendered variant, not the JSON API): plain server-rendered
// HTML, no SPA, no auth, no OCR. Everything sits on ONE paginated board:
//
//   LIST (html):  http://bip.braniewo.pl/artykuly/120/{page}/{per}/nieruchomosci-do-sprzedazy
//   LIST (xml):   http://bip.braniewo.pl/artykuly/xml/120/{page}/1   (100 recs/page)
//   ARTICLE:      http://bip.braniewo.pl/artykul/120/{id}/{slug}     (HTML stub)
//   FILE:         http://bip.braniewo.pl/attachments/download/{attId}  (text PDF)
//
// Each article is a thin HTML stub whose full notice lives in an attached
// text-PDF (pdftotext -layout — born-digital, no OCR). An announcement article
// usually carries TWO PDFs: the ogłoszenie (the notice we want) and a blank
// "ZGŁOSZENIE UDZIAŁU W PRZETARGU" application form (skipped). The PDF body is
// authoritative for announcement-vs-result routing.
//
//   ANNOUNCEMENT: "OGŁOSZENIE BURMISTRZA … Burmistrz Miasta Braniewa ogłasza
//     PIERWSZY PRZETARG USTNY NIEOGRANICZONY" — a table row (Położenie / area /
//     KW / cena wywoławcza / wadium) + prose; auction date "Przetarg odbędzie
//     się dnia DD.MM.YYYY".
//   RESULT: "Informację o wyniku PIERWSZEGO PRZETARGU … który odbył się w dniu
//     DD.MM.YYYY … cena wywoławcza N zł … najwyższa cena osiągnięta w przetargu –
//     N zł" (a value ⇒ sold; "– BRAK" ⇒ unsold). The achieved-price stream.
//
// Volume: ~3–5 flat-auction events/year across 2–3 properties, each cycling
// through I/II/III rounds; the board also carries land (grunt) auctions.
//
// `source: 'html'` — the adapter fetches attachments and extracts their text
// itself (pdf-text.js), so the refresh loop's OCR/pdf-text dispatch is bypassed;
// crawlResultDocs() returns refs that already carry `.text` (like Tarnowskie
// Góry / Skarżysko-Kamienna).

export const config = {
  id: 'braniewo',
  teryt: '280201_1', // gmina miejska Braniewo (powiat braniewski 2802, gmina-type
  //                    1) — for geoportal parcel deep-links. Confirm on the first
  //                    geoportal run.
  label: 'Braniewo',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Gmina Miasta Braniewa',
  host: 'bip.braniewo.pl',
  source: 'html',
};
