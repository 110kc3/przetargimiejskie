// Racibórz — Prezydent Miasta Racibórz auctions municipal flats (lokale mieszkalne)
// at open oral auctions (przetarg ustny nieograniczony) published on bipraciborz.pl,
// a standard Liferay-based BIP. All announcements and result notices are born-digital
// text PDFs, no auth, no SPA, no OCR. See spikes/slaskie/powiat-raciborski/raciborz.md.
//
// Board layout:
//   Active (sprzedaż):  /bip/dokumenty-akcja-wyszukaj-idstatusu-77591-idtypu-77593-
//                        idkategorii-39853-idzakladki-95775-numerzakladki-1
//                        Pagination: ?start=0 (default), ?start=1, … (10 items/page)
//   Results:            /en/bipkod/27948305
//                        One article per result; PDF at first /res/serwisy/pliki/<id>
//
// Each listing detail page is at ?komunikat=<id> on the same board URL.
// Attachments: first PDF = "ogłoszenie*.pdf" (the announcement); then registration
// forms, pełnomocnictwo.odt, szkic.pdf, JPG photos. Only the first PDF is scraped.
//
// `source: 'html'` — the adapter fetches and extracts the PDF itself (source is
// resolved inside crawl.js), so the refresh loop's OCR/pdf-text dispatch is bypassed.
// Result refs carry `.text` before being handed to refresh.js, exactly like Tarnowskie Góry.
//
// TERYT for Racibórz grodzki (city-county, powiat raciborski):
//   2462 (powiat raciborski grodzki) → gmina miejska 2462011 — confirm on first geoportal run.
//   Note: Racibórz is a city-county (gmina miejska stanowiąca powiat grodzki), not a
//   standard gmina inside a ziemski powiat.

export const config = {
  id: 'raciborz',
  teryt: '246201_1', // gmina miejska Racibórz TERYT (powiat grodzki 2462, type 1) —
  //                    confirm on the first geoportal run (ULDK was not reached in sandbox)
  label: 'Racibórz',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Racibórz',
  host: 'bipraciborz.pl',
  source: 'html',
};
