// Stargard (województwo zachodniopomorskie, powiat stargardzki) — Gmina-Miasto
// Stargard auctions municipal flats at "przetarg ustny nieograniczony" via its
// housing manager Stargardzkie TBS Sp. z o.o. Two complementary sources:
//   - ANNOUNCEMENTS: tbs.stargard.pl (WordPress, server-rendered HTML)
//     Paginated listing at /rodzaj-nieruchomosci/przetargi/page/N/
//     Detail pages have structured labeled fields: POWIERZCHNIA, WARTOŚĆ
//     NIERUCHOMOŚCI, DATA PRZETARGU, plus full legal body text.
//   - RESULTS: bip.stargard.eu/22358 (city BIP, server-rendered HTML)
//     Paginated list at /22358/strona/N (7 pages / ~102+ notices in 2026).
//     Each entry: symbol (Wynik0XX/YYYY), date, summary text (inline in list).
//     Detail page at /22358/dokument/NNNNN contains the same body text and a
//     linked PDF — achieved price is in the PDF only (not in the HTML body).
//
// Dedup strategy: BIP result notices include the address in the body text;
// announcements include it in title and URL slug. Dedup key = normalised address
// (parseAddress key). Both streams are flat-filtered by classifyKind.
//
// NOTE (confirm on first geoportal run): TERYT 3212011 is Stargard as a
// gmina miejska (city-county) within powiat stargardzki (321201). The
// geoportal deep-link uses '3212011' as the unit identifier.
//
// Volume: ~15–25 flat auctions/yr; ~102 results across all types in 2026 by
// June. No auth, no bot protection, no JS rendering required.

export const config = {
  id: 'stargard',
  teryt: '3212011', // gmina miejska Stargard (powiat stargardzki) — confirm on first geoportal run
  label: 'Stargard',
  voivodeship: 'zachodniopomorskie',
  authority: 'Gmina-Miasto Stargard',
  host: 'bip.stargard.eu',
  source: 'html',
};
