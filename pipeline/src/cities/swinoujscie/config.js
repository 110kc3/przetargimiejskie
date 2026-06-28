// Świnoujście — municipal property auctions managed by TBS Lokum sp. z o.o.
// (city-owned housing company, successor to ZGM Świnoujście) on behalf of
// Gmina Miasto Świnoujście. See spikes/zachodniopomorskie/swinoujscie/swinoujscie.md.
//
// Platform: Logonet CMS 2.9.0 — same vendor as Koszalin, Stargard, and
// multiple other Zachodniopomorskie cities.
//
// Both the active board (artykuly/1717) and the archive (artykuly/1718) are
// standard HTML pages listing article headings. Each article detail page
// carries a brief body blurb (auction date) and attachment links.
//
// Attachment types:
//   - Newer announcements (2026): legacy .doc (OLE2, parseable via catdoc)
//   - Older announcements (2024-2025): scanned PDF — text extraction yields
//     empty output; doc-text is skipped and price left null.
// The article TITLE on the board page carries address, area (m²), and round.
// The article BODY blurb carries the auction date. Price comes from the DOC
// attachment when available.
//
// Result notices: TBS Lokum does NOT publish "Informacja o wyniku" articles
// on the BIP. crawlResultDocs() returns [].
//
// TERYT: Świnoujście is a city-county (miasto na prawach powiatu) in
// Zachodniopomorskie. TERYT code 3263011 (powiat Świnoujście 3263, gmina
// miejska 011). Confirm on first geoportal run.

export const config = {
  id: 'swinoujscie',
  teryt: '3263011', // gmina miejska Świnoujście — confirm on first geoportal run
  label: 'Świnoujście',
  voivodeship: 'zachodniopomorskie',
  authority: 'Urząd Miasta Świnoujście',
  host: 'bip.um.swinoujscie.pl',
  source: 'html',
};
