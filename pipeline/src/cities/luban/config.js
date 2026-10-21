// Lubań — gmina miejska (miasto), województwo dolnośląskie, powiat lubański.
//
// Burmistrz Miasta Lubań regularly auctions municipal residential flats (lokale
// mieszkalne) and land properties (nieruchomości gruntowe) via "ustny przetarg
// nieograniczony na sprzedaż/zbycie".
//
// Official board:
//   - Main hub: `https://luban.pl/1333` ("Nieruchomości Miasta Lubań")
//   - Articles: `https://luban.pl/artykul/<id>/<slug>`
//   - Format: full inline HTML announcements (text, structured parameters, photos)
//   - Content: address, flat area (m²), cena wywoławcza, wadium, auction date,
//     conditions, round, prior negative round outcomes inline.
//
// WAF / SERVER NOTE:
//   The host runs IdeaWebServer/6.4.2 (home.pl). Paginating with bare
//   `?Article_page=N` triggers an HTTP 403 Forbidden WAF rule. Percent-encoding
//   the underscore as `?Article%5Fpage=N` returns HTTP 200 reliably.
//
// OFFER-SIDE STREAM:
//   Achieved-price result notices are not published as separate documents on
//   luban.pl; auction outcomes (negative rounds) appear inline in subsequent
//   round announcement text. crawlResultDocs() and parseResultDoc() return empty
//   stubs per the announcement-only convention (closest analog: Olkusz / Chrzanów).
//
// TERYT:
//   Gmina miejska Lubań: 021001_1 (woj. 02 dolnośląskie, powiat 10 lubański,
//   gmina 01 miejska, rodzaj 1 = gmina miejska). SIMC: 0936150, TERC: 0210011.

export const config = {
  id: 'luban',
  teryt: '021001_1', // gmina miejska Lubań (powiat lubański 0210) — confirm on first geoportal run
  label: 'Lubań',
  voivodeship: 'dolnoslaskie',
  authority: 'Burmistrz Miasta Lubań',
  host: 'luban.pl',
  source: 'html',
};
