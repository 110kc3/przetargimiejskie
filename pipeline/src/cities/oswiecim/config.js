// Oświęcim — the CITY (Gmina Miasto Oświęcim, Prezydent Miasta, Wydział Mienia
// Komunalnego — Referat Gospodarki Nieruchomościami; symbol MK.6840 = sales)
// auctions municipal flats, buildings and land. Distinct from the rural "Gmina
// Oświęcim". Województwo małopolskie. See SPIKE-NEIGHBORS.md.
//
// Shape: MULTI-PROPERTY notices (a numbered list of lokale, each with its own
// cena wywoławcza + area + auction date), standard "PREZYDENT … ogłasza …
// przetarg ustny nieograniczony na sprzedaż …" vocabulary. CMS is REKORD SI
// (bip.oswiecim.um.gov.pl, host bip2.umoswiecim.rekord.com.pl) — a server-rendered
// list (/5987 Nieruchomości) + /5987/dokument/<id> detail pages whose substantive
// text lives in attachment PDFs (/api/download/file?id=). A full WordPress mirror
// (oswiecim.pl) carries the same items, with HTML body text for older notices.
//
// NEEDS-LIVE-VERIFY (the spike's gate): the modern (2025–2026) attachment PDFs
// appear to be SCANNED images → OCR, while older mirror items are clean HTML. So
// the crawler extracts dokument HTML first and falls back to pdfText→OCR on the
// attachment PDF; the OCR output quality MUST be confirmed on the first run
// (closest analogs: Bielsko-Biała for the REKORD list/`api/download/file`
// plumbing, Gliwice for the OCR-PDF reality). The multi-property body parser is
// groundtruthed against a real (clean) notice (Mały Rynek 9/4–9/6).
//
// `source: 'html'` — the adapter extracts text itself (HTML, then pdfText/OCR).
// Result notices exist but are scanned PDFs (no clean achieved-price stream yet) —
// crawlResultDocs / parseResultDoc are stubs for now.

export const config = {
  id: 'oswiecim',
  teryt: '121301_1', // gmina miejska Oświęcim (powiat oświęcimski) — confirm on first geoportal run
  label: 'Oświęcim',
  authority: 'Urząd Miasta Oświęcim (Wydział Mienia Komunalnego)',
  host: 'bip.oswiecim.um.gov.pl',
  source: 'html',
};
