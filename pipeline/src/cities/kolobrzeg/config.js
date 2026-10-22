// Kołobrzeg — Zachodniopomorskie, powiat kołobrzeski (gmina miejska, seat of powiat, ~44k pop.).
//
// Prezydent Miasta Kołobrzeg (Gmina Miasto Kołobrzeg, Wydział Gospodarki Nieruchomościami,
// ul. Ratuszowa 13) sells municipal residential flats (lokale mieszkalny) and land plots
// at oral auctions (ustny przetarg nieograniczony) under art. 38 UGN.
//
// *** PLATFORM: Madkom SIP BIP — JSON REST API ***
// The city BIP at bip.um.kolobrzeg.pl is backed by the Madkom SIP REST API:
//   GET /api/menu/<menuId>/articles?limit=N&offset=K   -> board listing
//   GET /api/articles/<articleId>                      -> article detail + attachments[]
//   GET /api/files/<attachmentId>                      -> attachment file bytes (.doc / .pdf)
//
// Key boards:
//   - Announcements (Sprzedaż):       menu 31009 ("Przetargi - sprzedaż")
//   - Results (Rozstrzygnięcia):       menu 30712 ("Rozstrzygnięcia - sprzedaż")
//   - Pre-auction designations (Wykaz): menu 31012 ("Wykazy - zbycie")
//
// Result notices are published as scanned PDFs (bizhub scan); core ocrPdf caches them.
// Announcements often carry accessible Word (.doc) attachments parsed with docText.

export const config = {
  id: 'kolobrzeg',
  // gmina miejska Kołobrzeg: TERC/TERYT 3208011 (woj. zachodniopomorskie 32, powiat 08 kołobrzeski, gmina 01, typ 1 miejska)
  teryt: '320801_1',
  label: 'Kołobrzeg',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Kołobrzeg',
  host: 'bip.um.kolobrzeg.pl',
  // Adapter extracts / OCRs document text directly and attaches to result refs
  source: 'html',
};
