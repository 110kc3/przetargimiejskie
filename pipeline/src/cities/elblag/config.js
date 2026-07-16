// Elbląg (Warmińsko-Mazurskie, miasto na prawach powiatu) — the Prezydent Miasta
// Elbląg auctions municipal flats, built properties and land on the city's own
// BIP (bip.elblag.eu, Logonet eUrząd CMS — footer reads "Wersja systemu 2.9.0",
// same vendor as Tarnowskie Góry / Kędzierzyn-Koźle, THIS adapter's closest
// structural analog). See spikes/warminsko-mazurskie/elblag/elblag.md (verdict
// BUILD, spiked 2026-06-27; live-verified again while building, 2026-07-16).
//
// Shape — DIFFERENT from Tarnowskie Góry/Kędzierzyn-Koźle in two load-bearing
// ways (verified live 2026-07-16):
//   1. Elbląg's board is server-rendered HTML with a clean per-item DETAIL PAGE
//      carrying a structured "Szczegóły" <table>: Adres nieruchomości / Przetarg
//      na (round, Roman numeral) / Typ przetargu / Rodzaj nieruchomości (kind) /
//      Cena wywoławcza / Data przetargu (incl. a machine-readable <time
//      datetime="…"> ISO stamp). Most announcement fields come straight from
//      this HTML table — NOT from parsing PDF prose. The linked PDF ("Ogłoszenie
//      - wersja edytowalna") is only needed for the exact building/apt number,
//      usable floor area, and the dzialka/obręb/plot-area triple, none of which
//      the HTML table carries.
//   2. RESULT ("Wyniki z przetargu") documents are BATCH tables, not one-per-
//      property prose: a single document can report MULTIPLE properties'
//      outcomes decided the same day, grouped by round header ("Pierwszy ustny
//      przetarg ograniczony" / "…nieograniczony" …), and the SAME batch document
//      is frequently linked from more than one item's detail page (verified
//      live: attachment 18393 on the ul. Legionów page and 18396 on the ul.
//      Dębowa page are byte-identical). crawl.js dedupes by extracted TEXT so a
//      shared batch is only queued once; parse.js's parseResultDoc parses EVERY
//      row of a batch into its own record (the "a single notice can list
//      several properties" case flagged in ADAPTER-GUIDE §5).
//
// The office publishes BOTH a born-digital "wersja edytowalna" attachment
// (announcements → PDF; results → legacy .doc — both text-extractable, no OCR
// needed) and a scanned "- skan" twin (dropped, same dual-attachment pattern as
// Kędzierzyn-Koźle's text/skan PDFs).
//
// BEZPRZETARGOWO (tenant-sale) EXCLUSION — the load-bearing correctness
// requirement per the spike: ZBK/the city ALSO runs an off-auction tenant-sale
// stream, published as "ZARZĄDZENIE … w sprawie … wykazu lokali mieszkalnych
// przeznaczonych do sprzedaży na rzecz najemców … w trybie bezprzetargowym" on a
// SEPARATE board (bip.elblag.eu/artykuly/191/wykaz-nieruchomosci-zbycie — NEVER
// crawled by this adapter, which only visits /przetargi-nieruchomosci/190, the
// real-auction board). As defense in depth (in case that URL scoping ever
// weakens), parse.js's isBezprzetargowoDoc() gate is checked explicitly inside
// both parseAnnouncement and parseResultDoc — verified live against a REAL
// tenant-sale notice (ZPME nr 273/2026, attachment 18374): it carries no "cena
// wywoławcza"/"przetarg ustny" and must never enter listings/properties.json.
//
// `source: 'html'` — like TG/KK, the adapter extracts attachments itself, so
// crawlResultDocs() returns refs that already carry `.text`.

export const config = {
  id: 'elblag',
  teryt: '286101_1', // gmina miejska Elbląg (miasto na prawach powiatu) — TERYT
  //                    unconfirmed in-sandbox (no ULDK access); confirm on the
  //                    first geoportal run, per convention (see kedzierzyn-kozle).
  label: 'Elbląg',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Prezydent Miasta Elbląg (Urząd Miejski w Elblągu)',
  host: 'bip.elblag.eu',
  source: 'html',
};
