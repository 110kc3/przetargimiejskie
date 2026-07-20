// Głogów — Dolnośląskie, powiat głogowski (gmina miejska; city is the powiat
// seat, ~64k pop.).
//
// Prezydent Miasta Głogowa (Wydział Gospodarki Nieruchomościami — case refs
// "WRM.DGiGG.6840.5.{N}.{YEAR}.JSz") sells municipal flats, commercial units,
// garages, whole houses ("nieruchomość zabudowana") and land at "przetarg
// ustny (nie)ograniczony", publishing announcements + achieved-price results
// on ONE BIP board: "Sprzedaż nieruchomości gminnych" (legacy idmp=27).
//
// *** PLATFORM MIGRATION — read before touching crawl.js ***
// The BUILD spike (spikes/dolnoslaskie/powiat-glogowski/glogow.md, live-
// verified 2026-06-30) profiled glogow.bip.info.pl as a server-rendered
// bip.info.pl BIP: listing index JS-gated, but individual document pages AND
// attached PDFs fetchable without JS. Re-verified LIVE 2026-07-19 before
// writing this adapter: the ENTIRE host now returns a bare Angular
// `<app-root>` shell ("Please enable JavaScript") for every path tried
// (query-string `index.php?idmp=27`, comma-path `index,idmp,27,r,r`, and
// individual `dokument,iddok,...` pages alike) — `last-modified: 2026-07-10`,
// i.e. the platform was upgraded ~10 days after the spike. This is the SAME
// class of migration Złotoryja hit (see cities/zlotoryja/crawl.js's header) —
// newer bip.info.pl is an Angular SPA backed by a JSON:API REST layer under
// `/api/fo/` — EXCEPT here it rolled out on the SAME host/domain
// (glogow.bip.info.pl), not a moved one.
//
// See crawl.js's header for the reverse-engineered API shape and why every
// attachment PDF is downloaded + text-extracted directly (core's pdfText())
// rather than trusting the API's own `attachments[].attributes.content`
// field, which is present for some documents but silently EMPTY for others
// (verified live: multi-lot announcement PDFs came back with content_len=0).
//
// TLS: this host ships an INCOMPLETE certificate chain (missing intermediate
// CA — same class of issue as bip.zlotoryja.pl / bip.miastozabrze.pl; curl
// needs `-k`, Node needs `insecureTLS: true`). Data is public/read-only, so
// chain verification is relaxed for this host only.
//
// See SPIKE: spikes/dolnoslaskie/powiat-glogowski/glogow.md — VERDICT: BUILD
// (Medium effort); this header + crawl.js document what changed since then.

export const config = {
  id: 'glogow',
  // gmina miejska Głogów (powiat głogowski TERYT 0203, gmina-type 1 =
  // miejska) -> 020301_1. Confirmed via GUS/TERYT (WebSearch 2026-07-19:
  // wykaz.rky.pl/g0203011.html). Confirm on first geoportal run.
  teryt: '020301_1',
  label: 'Głogów',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Głogowa',
  host: 'glogow.bip.info.pl',
  // The adapter builds each result ref's `.text` itself (title + PDF-extracted
  // body, see crawl.js), so the refresh loop's OCR/pdf-text dispatch is
  // bypassed — matches zgorzelec/lubliniec/zlotoryja's 'html' convention.
  source: 'html',
};
