// Warszawa — Miasto Stołeczne Warszawa (Mazowieckie · miasto na prawach powiatu).
//
// PRIMARY SOURCE: Elektroniczna Tablica Ogłoszeń (ETO) at eto.um.warszawa.pl,
// category 165 ("Wykup lokalu, przetargi"). ETO is the CENTRAL AGGREGATOR for
// all flat-sale auctions across all 18 dzielnice. Individual dzielnica portals
// (srodmiescie.um.warszawa.pl, zoliborz.um.warszawa.pl, …) simultaneously host
// the same announcements, but they ALSO submit them to ETO — confirmed live on
// 2026-06-29 (Wola's Okopowa 78 article states "zostało podane do publicznej
// wiadomości ogłoszenie … na ETO eto.um.warszawa.pl"). Scraping ETO /category/165/
// gives a near-complete view without needing to crawl each dzielnica separately.
//
// ## District topology (resolved 2026-06-29)
//
// FINDING: **ETO category/165 IS the sole required source for flat auctions.**
// Evidence gathered on 2026-06-29 from live fetches:
//
//   1. All 6 Śródmieście flat-sale announcements (Marszałkowska 81 m 11–19,
//      Noakowskiego 4 nr 17 & 18) appeared on ETO /category/165/ within their
//      active publication windows. Śródmieście's own /przetargi-na-sprzedaz
//      page listed only items already on ETO.
//
//   2. Wola dzielnica's announcement page for Okopowa 78 (zabudowana, not a flat,
//      but same publishing workflow) explicitly states it was submitted to ETO.
//
//   3. Mokotów /przetargi page contains no active flat auction items — directs to
//      BIP and ZMSP, no separate flat-auction stream.
//
//   4. No dzielnica / ZGN BIP page found with active flat auctions NOT on ETO.
//
// CONCLUSION: scraping ETO /category/165/announcement gives near-complete coverage
// without crawling all 18 dzielnica portals. A TODO exists to spot-check
// additional dzielnice (Praga-Południe, Bielany, Żoliborz ZGN BIP) on the first
// live CI run to confirm there is no parallel stream.
//
// ETO item anatomy:
//   - Items with href="https://eto.um.warszawa.pl/category/165/announcement/<id>"
//     are published directly on ETO (AMW + some city units). They carry a PDF
//     attachment at eto.um.warszawa.pl/announcement/attachment/<id>/<att-id>.
//   - Items with href="https://<dzielnica>.um.warszawa.pl/-/<slug>"
//     are city-owned dzielnica announcements. Full detail (article text, dates,
//     auction info) is in the dzielnica article HTML — no DOCX in current samples.
//     The ETO list entry carries the title, "Od"/"Do" dates, and ETO nr.
//
// AMW (Agencja Mienia Wojskowego): publishes Warsaw military-flat auctions to ETO
// category/165. Included in this adapter's output (not filtered out); the caller
// can filter by authority if needed. AMW items are identifiable by
// "Agencja Mienia Wojskowego" in the title.
//
// Per-dzielnica sources (TODO — not wired in this pass):
//   Śródmieście  https://srodmiescie.um.warszawa.pl/przetargi-na-sprzedaz  (cross-posts to ETO)
//   Żoliborz     https://zoliborz.um.warszawa.pl/nieruchomosci-na-sprzedaz  (TBC)
//   Mokotów      https://mokotow.um.warszawa.pl/przetargi                   (no active flat stream 2026-06-29)
//   Wola         https://wola.um.warszawa.pl/nieruchomosci-na-sprzedaz      (cross-posts to ETO)
//   Praga-Pd     N/A — site returned HTTP 000 on 2026-06-29 probe
//   [13 others]  TBC on first CI run
//
// Result notices (wyniki przetargu): ETO category/165 published result notices
// ("Informacja o wyniku…") in May 2026 (spike data, e.g. nr 8944/2026, nr 8936/2026).
// They have short windows (~8 days). crawlResultDocs() captures them while active;
// they may also appear on the dzielnica portal. The achieved price may be in the
// article text on the dzielnica portal (bip.warszawa.pl result pages timed out
// in spike; dzielnica portal text is confirmed fetchable).
//
// DOCX: the spike noted DOCX attachments for older announcements. Current live
// fetches (2026-06-29) show NO DOCX for city-owned items; AMW items carry PDFs
// attached directly on ETO. The adapter therefore treats all items as HTML-text
// (source:'html') and extracts data from article text + ETO title.
//
// Closest analog: Kielce (single BIP board, both active listings + result notices
// on same board, result attachments fetched separately). Key difference:
// Warszawa uses EXTERNAL links on the list page for city items; address/price
// come from the detail article text rather than the list title.

export const config = {
  id: 'warszawa',
  // TERYT for Warszawa grodzki powiat (miasto na prawach powiatu, SIMC 0918123).
  // Provisional — confirm against ULDK / GUS on first geoportal run.
  teryt: '146501_1',
  label: 'Warszawa',
  voivodeship: 'mazowieckie',
  authority: 'Miasto Stołeczne Warszawa',
  host: 'eto.um.warszawa.pl',
  source: 'html',
};
