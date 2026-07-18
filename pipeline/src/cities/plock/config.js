// Płock (mazowieckie, miasto na prawach powiatu) — municipal FLAT auctions run
// not through the city BIP but through a city-owned company, Agencja
// Rewitalizacji Starówki ARS Sp. z o.o. (ars.plock.pl), which manages the Old
// Town revitalisation stock and periodically sells individual flats (and
// occasionally whole part-residential buildings) at open oral auction
// ("publiczny przetarg ustny na sprzedaż ..."). See
// spikes/mazowieckie/plock/plock.md — VERDICT: BUILD (Medium, LIVE-verified
// 2026-06-27).
//
// The city's main BIP (nowybip.plock.eu) only carries land / bezprzetargowy
// tenant-sale lists (out of scope); MZGM-TBS runs RENTAL auctions only (out of
// scope: garages, commercial). ARS is the sole publisher of open flat/building
// SALE auctions.
//
// CLOSEST ANALOG: bytom (TBS Bytom) — a city-owned company publishing flat
// auctions on its own non-BIP website, paginated HTML + PDF attachments. ARS
// differs in two ways, live-verified 2026-07-18: (1) HTTPS resets the TLS
// handshake ("Recv failure: Connection reset by peer" on the ClientHello) —
// HTTP only, see crawl.js; (2) announcement AND result PDFs are a MIX of
// born-digital and SCANNED (Producer "KONICA MINOLTA bizhub C458" — no text
// layer) — crawl.js tries pdfText first and falls back to core/ocr-pdf.js
// when the quick text is empty/too short (the kwidzyn/zabkowice-slaskie
// idiom), for BOTH the announcement and result streams.
//
// Volume is LOW (2-5 flat/building sale auctions per year, per the spike's
// paginated-archive estimate) — expected, not a bug.
//
// `source: 'html'` — crawlResultDocs() extracts the result text itself
// (title + body + pdfText/ocrPdf) and attaches it as ref.text; refresh.js's
// parse loop reads ref.text directly (see crawl.js's "TYTUL:" marker
// convention, which lets parseResultDoc recover the clean notice title under
// the registry's fixed (text, auction_date, pdf_url) signature).

export const config = {
  id: 'plock',
  // Płock grodzki (miasto na prawach powiatu), woj. mazowieckie (14). Best-
  // effort placeholder (NOT yet geoportal/ULDK-confirmed) — confirm on first
  // geoportal run before trusting this.
  teryt: '146201_1',
  label: 'Płock',
  voivodeship: 'mazowieckie',
  authority: 'Agencja Rewitalizacji Starówki ARS Sp. z o.o. / Miasto Płock',
  host: 'www.ars.plock.pl',
  source: 'html',
};
