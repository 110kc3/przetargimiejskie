// Chełmno (województwo kujawsko-pomorskie, powiat chełmiński) — Gmina Miasto
// Chełmno (Burmistrz Miasta Chełmna) auctions municipal flats, built properties
// and land at ustny przetarg nieograniczony and publishes BOTH the announcement
// and the achieved-price resolution on one BIP record. See
// spikes/kujawsko-pomorskie/powiat-chelminski/chelmno.md.
//
// Shape (closest analog: Skarżysko-Kamienna — SAME CMS VENDOR, Logonet eUrząd
// v2.9.0): server-rendered HTML with a clean per-page/per-record XML feed, no
// SPA, no OCR, no auth, no bot blocks. UNLIKE Skarżysko there are NO separate
// "Informacja o wyniku" result pages: every record is a single announcement
// that carries an INLINE <rozstrzygniecie> element which is EMPTY while the
// auction is pending and filled once concluded ("Nabywcą … został … za cenę
// 29.290,00 zł." → sold / "… wynikiem negatywnym." → unsold). So the
// active-vs-result split is "is <rozstrzygniecie> non-empty?", not a title gate.
//
//   BOARD XML:   https://bip.chelmno.pl/przetargi-nieruchomosci/xml/{page}/1
//                  → <ilosc-stron> pages, each listing <artykul><url>… items
//   RECORD XML:  https://bip.chelmno.pl/przetarg-nieruchomosci/xml/{id}/1
//                  → adres-nieruchomosci, przetarg-na, typ-przetargu,
//                    rodzaj-nieruchomosci, cena-wywolawcza, data-przetargu,
//                    rozstrzygniecie (CDATA HTML), tresc (CDATA HTML full body)
//   HUMAN PAGE:  https://bip.chelmno.pl/przetarg-nieruchomosci/{id}/{slug}
//
// Volume: ~104 records (2020–2026); lokal mieszkalny ≈ 30–40. Many lokal
// użytkowy records are DZIERŻAWA (10-year commercial leases) — skipped.
//
// `source: 'html'` — the adapter fetches + parses the XML feed itself and hands
// each result ref a ready `.text` blob (built by parse.buildRecordText), so the
// refresh loop's OCR / pdf-text dispatch is bypassed (exactly like Skarżysko).

export const config = {
  id: 'chelmno',
  teryt: '040401_1', // gmina miejska Chełmno (powiat chełmiński 0404, gmina-type
  //                    1) — for geoportal parcel deep-links; confirm on the
  //                    first geoportal run.
  label: 'Chełmno',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Gmina Miasto Chełmno',
  host: 'bip.chelmno.pl',
  source: 'html',
};
