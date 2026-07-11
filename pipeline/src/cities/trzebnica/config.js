// Trzebnica (dolnośląskie, powiat trzebnicki, gmina miejsko-wiejska — the
// powiat seat) — Gmina Trzebnica (Wydział Geodezji i Gospodarki
// Nieruchomościami, symbol GGN) auctions municipal flats (Rynek, W. Witosa,
// Henryka Brodatego, Św. Jadwigi ... plus village flats with no formal street,
// e.g. Boleścin) and undeveloped land across its many villages (Kobylice,
// Szczytkowice, Biedaszków Wielki, Komorowo, Koniowo, Głuchów Górny, ...), on
// the city BIP (bip.trzebnica.pl). See
// spikes/dolnoslaskie/powiat-trzebnicki/trzebnica.md.
//
// Shape (closest LIVE-VERIFIED analog: naklo-nad-notecia — SAME CMS VENDOR,
// Logonet eUrząd v2.9.0, IDENTICAL clean XML feed URL scheme):
//   BOARD:  https://bip.trzebnica.pl/przetargi-nieruchomosci/xml/{page}/1
//   RECORD: https://bip.trzebnica.pl/przetarg-nieruchomosci/xml/{id}/1
// NOTE — this differs from the dispatch brief's suggested analog
// (tarnowskie-gory): tarnowskie-gory's board runs a DIFFERENT Logonet
// sub-template with a `/api/menu/<id>/articles` JSON API — verified LIVE that
// this endpoint 404s on bip.trzebnica.pl. naklo-nad-notecia's XML-feed shape
// is the one that actually matches trzebnica byte-for-byte (same tag names:
// adres-nieruchomosci / przetarg-na / typ-przetargu / rodzaj-nieruchomosci /
// cena-wywolawcza / data-przetargu / zalaczniki/zalacznik/{url,nazwa}). See
// crawl.js for the corrected clone lineage.
//
// UNLIKE naklo, trzebnica's BOARD-level XML already embeds every record's
// core fields (address/kind/price/date/round text) — no per-record fetch is
// needed just to enumerate active listings. A per-record fetch IS still
// needed to reach <zalaczniki> (attachment list), which is where: (a) the
// deep fields live — usable floor area (flats) / parcel number + plot area
// (land) sit ONLY in the announcement PDF attachment, never in the board XML
// or the free-text "Przetarg na" summary; and (b) the (rare) published
// "INFORMACJA O WYNIKU PRZETARGU" result attachment is discoverable.
//
// Volume (2026-07-11 live census, all 366 records fetched): 366 total board
// records back to 2021, 34 "Lokal mieszkalny" (flats, recurring: Rynek 12,
// Rynek 12/4, W. Witosa 12/13, Św. Jadwigi 8, Henryka Brodatego 18/7,
// Kościelna 29, + village flats with no street e.g. Boleścin, Biedaszków
// Wielki), the rest overwhelmingly "Nieruchomość niezabudowana" (land) with a
// few "Nieruchomość zabudowana" / "Lokal użytkowy". ZERO najem/dzierżawa
// (lease) records exist on this board (full census) — isLease() is kept as a
// defensive gate only (see parse.js).
//
// Achieved-price stream is VERY SPARSE: of all 366 records, only 2 carry a
// body-CONFIRMED "informacja o wyniku przetargu" attachment (Szczytkowice GGN
// P/10/2026, both parcels, both unsold) — most concluded auctions here never
// get a machine-readable result posted at all (contradicts the spike's
// optimistic read; see crawl.js header). ONE attachment was found MISLABELED
// (Kobylice GGN P/9/2026's "Informacja o wyniku przetargu"-named attachment
// actually contains the ANNOUNCEMENT text, confirmed by cross-reading a later
// notice's "Terminy wcześniejszych przetargów" recap, which states that I
// przetarg round ended "wynikiem negatywnym") — so isResultNotice() re-checks
// the PDF BODY header, never trusting the attachment's <nazwa> label alone.
//
// Attachments observed are ALL PDF (born-digital, pdftotext-readable) — the
// spike's ".doc/.docx" expectation was not observed live; pdfText() alone
// covers everything seen. docText() is still imported as a defensive fallback
// (cheap, matches the naklo/Zabrze pattern) in case a future attachment is a
// legacy Word file.

export const config = {
  id: 'trzebnica',
  // Powiat trzebnicki TERYT = 0220 (web-corroborated: stat.gov.pl identifier
  // index / wykaz.rky.pl — NOT eteryt.stat.gov.pl direct lookup, so treat as
  // provisional); gmina Trzebnica (miejsko-wiejska, the whole gmina — this
  // adapter covers both the town and its many villages) = 022003, type "_3"
  // (whole miejsko-wiejska gmina, per the tarnowskie-gory/naklo/gniezno
  // 6-digit+type convention). CONFIRM on the first geoportal run before
  // trusting this for any parcel deep-link.
  teryt: '022003_3',
  label: 'Trzebnica',
  voivodeship: 'dolnoslaskie',
  authority: 'Gmina Trzebnica',
  host: 'bip.trzebnica.pl',
  source: 'html',
};
