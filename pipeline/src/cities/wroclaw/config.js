// Wrocław (województwo dolnośląskie, miasto na prawach powiatu) — the city
// (Prezydent Wrocławia, Wydział Sprzedaży Lokali) auctions municipal flats via
// "przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego",
// published on a bespoke Logonet eUrząd BIP (bip.um.wroc.pl). High volume:
// the "Aktualne" + "lokal mieszkalny" filter alone yields dozens of listings;
// the "Rozstrzygnięte" archive runs 80+ pages at 10/page.
//
// TWO-SOURCE achieved-price picture (see spikes/dolnoslaskie/wroclaw/wroclaw.md):
//   1. PRIMARY (live-verified 2026-07-16, contradicts the spike's original read):
//      each BIP article itself grows an "Informacja o wyniku (wersja tekstowa)"
//      .docx attachment once resolved — but ONLY for a ~7-day RODO publication
//      window after the auction date (confirmed live: a docx dated "Podana do
//      publicznej wiadomości w dniach 09.07.2026 r. do 16.07.2026 r." on an
//      article whose auction was 01.07.2026; older resolved articles in the
//      same run had NO attachment at all). The crawler must run promptly
//      (daily refresh.yml comfortably beats the 7-day window).
//   2. SECONDARY — Giełda Nieruchomości (gn.um.wroc.pl), a separate sequential-ID
//      catalog with a durable (non-expiring) "Cena uzyskana" field, used as a
//      supplemental/backfill source for lots whose BIP window has already
//      closed. See crawl.js for the bounded ID-scan window.
//
// `source: 'html'` — this adapter resolves attachment text itself (docText())
// during crawlResultDocs() and attaches `.text` to each ref (refresh.js reads
// `ref.text` directly for non-'pdf'/'pdf-text' sources).

export const config = {
  id: 'wroclaw',
  // TERYT for powiat grodzki Wrocław (miasto na prawach powiatu, woj.
  // dolnośląskie): woj 02 + powiat 64 + gmina serial 01 + rodzaj 1 (miejska).
  // Confirm on first geoportal run.
  teryt: '026401_1',
  label: 'Wrocław',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miejski Wrocławia (Wydział Sprzedaży Lokali)',
  host: 'bip.um.wroc.pl',
  source: 'html',
};
