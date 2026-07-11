// Pszczyna (województwo śląskie, powiat pszczyński) — Burmistrz Pszczyny
// (Urząd Miejski w Pszczynie, Wydział Geodezji i Gospodarki Gruntami) auctions
// municipal flats (lokale mieszkalne) AND undeveloped land (nieruchomości
// niezabudowane) via "przetarg ustny nieograniczony", and separately publishes
// "Informacja o wyniku przetargu" result notices with a STRUCTURED achieved-price
// HTML table (Liczba osób dopuszczona/niedopuszczona | Cena wywoławcza/osiągnięta
// | Nabywca). See spikes/slaskie/powiat-pszczynski/pszczyna.md.
//
// CORE-TIER CITY (Śląskie) — public + blocking on refresh.yml sanity-check.
//
// Shape: ESC S.A. / VelaBIP hosted BIP (bip.pszczyna.pl), server-rendered HTML,
// no JS gate. Closest analog: bochnia (custom server-HTML, both streams on one
// board, title-routed ann/result). Deviates from bochnia in two load-bearing
// ways (see parse.js/crawl.js headers for the live-verified detail):
//   1. RESULT notices always carry the full legal text INLINE in
//      `<article id="cnt" class="document">…<article class="content">` — pure
//      HTML, no PDF needed, with the achieved-price table described above.
//   2. ANNOUNCEMENT (offer-side) notices are a MIX: some (pre-~2023) have that
//      same inline content; MOST current ones (verified live, 2026-07-10) ship
//      an EMPTY `<article class="content">` — the operative text lives ONLY in
//      an attached born-digital text PDF ("Pliki do pobrania" → /zalacznik/N).
//      crawl.js therefore tries inline HTML first and falls back to
//      pdfText()/docText() on the first .pdf/.doc(x) attachment when the inline
//      body is empty/too short.
//
// DISCOVERY: this BIP's own "Przetargi" category board (/lista/przetargi) is
// thin and largely unrelated (Pszczyńskie Centrum Kultury's own procurement
// notices, per its breadcrumb — a shared multi-tenant category quirk flagged in
// the spike). The comprehensive, paginated source is the site's own full-text
// search (`/szukaj//<phrase>[////<page>]`), queried for
// "sprzedaż lokalu mieszkalnego" (268 hits / 27 pages, live 2026-07-10) and
// "sprzedaż nieruchomości niezabudowanej" (220 hits / 22 pages) — both ann +
// result notices, newest first, title-routed. A legacy `pszczyna.bip.info.pl`
// board exists as a possible backfill fallback (not wired here — the search
// endpoint already reaches back to 2007).
//
// FLAT ADDRESSING QUIRK (real, load-bearing — see parse.js flatAddressFromText):
// "lokal mieszkalny nr <ID>" is either a bare number (single-building street,
// e.g. "Rynek 22" nr "3") or a compound "<bldg>/<unit>" where <bldg> is ONE of
// the street's own (possibly multi-number/range) addresses, e.g. "Wojciecha
// Korfantego 19-35" nr "27/1" (bldg 27 is within the 19-35 range), "Karola
// Szymanowskiego 20-22-24" nr "22/5", "Bednarska 21 (i Rynek 3)" nr "21/4".
// The key is built from street + the compound id directly (dropping the street's
// own range/number), or street + streetNumber + flatId when the flat id has no
// slash of its own.
//
// OUT OF SCOPE: dzierżawa/najem/wydzierżawienie (title-filtered — confirmed real
// example: "…na wydzierżawienie nieruchomości … zabytkowego parku pszczyńskiego
// (Dmuchaniec)"); azk.pszczyna.pl (AZK — housing admin/procurement only, no
// sales); bip.powiat.pszczyna.pl (Starosta — different JST, county property).
//
// `source: 'html'` — the adapter extracts inline HTML / attachment text itself.
//
// NOTE (confirm on first CI refresh): search-endpoint pagination + the
// inline-vs-PDF split were verified against live fetches (2026-07-10); the
// parsers are groundtruthed against real captured bodies (see parse.js).

export const config = {
  id: 'pszczyna',
  // gmina miejsko-wiejska Pszczyna. Numeric prefix 241005 CONFIRMED via GUS
  // TERYT (WebSearch 2026-07-10: eteryt.stat.gov.pl / wykaz.rky.pl — powiat
  // pszczyński = 2410, gmina Pszczyna miejsko-wiejska = 2410053, obszar
  // wiejski = 2410055). The "_4" rodzaj-gminy suffix (miasto/urban-seat) is
  // this repo's convention for miejsko-wiejska gminas (mirrors olkusz
  // '121006_4') — LOW-MEDIUM confidence: Pszczyna also sells rural-sołectwo
  // land (e.g. Czarków, Łąka — see land results), which may resolve better
  // under the "_5" (obszar wiejski) variant. Confirm via ULDK on first
  // geoportal enrichment run; either digit prefix (241005) is solid.
  teryt: '241005_4',
  label: 'Pszczyna',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Pszczyny (Urząd Miejski w Pszczynie)',
  host: 'bip.pszczyna.pl',
  source: 'html',
};
