// Sandomierz (województwo świętokrzyskie, powiat sandomierski) — Gmina Miejska
// Sandomierz (Urząd Miejski, Wydział Gospodarki Nieruchomościami) directly
// conducts and publishes "przetarg ustny nieograniczony/ograniczony na
// sprzedaż" for municipal flats AND undeveloped land, and also publishes the
// achieved-price "Informacja o wyniku przetargu" result notices. Both streams
// are plain server-rendered HTML articles on the city BIP. See
// spikes/swietokrzyskie/powiat-sandomierski/sandomierz.md.
//
// Shape (closest analog: bochnia/olkusz — WordPress/custom-HTML gmina, full
// legal text inline, no PDF/OCR needed). The CMS identifies itself as SkyCMS
// (cookie `cms_public` / `skycms_LanguageId`) — not in ADAPTER-GUIDE's CMS
// table by name, but the shape matches the "WordPress / custom HTML" row
// exactly: numeric-ID article URLs, a single mixed category board with
// `?Page=N` pagination, inline HTML notices.
//
//   BOARD: https://bip.um.sandomierz.pl/67/132/sprzedaz-i-dzierzawa-mienia-komunalnego.html
//          (+ `?Page=N`, ~590 results / ~66 pages, newest first)
//   POST:  https://bip.um.sandomierz.pl/{id}/132/{slug}.html
//          (redirects 301 -> /{id}/{slug}.html, the canonical form; `getText`
//          follows redirects transparently)
//
// The board is a MIXED stream — flat-sale announcements/results, land-sale
// announcements/results, tenant "sprzedaż na rzecz najemcy" (bezprzetargowo)
// wykazy, dzierżawa/najem wykazy+results, and "wolny lokal mieszkalny"
// (vacant-flat-for-RENT) notices — so candidates are routed by TITLE first
// (cheap, pre-fetch) and confirmed by BODY (authoritative — see parse.js
// isSaleBody: a real board preambule/body mismatch was found live, see
// below). OUT OF SCOPE: dzierżawa/najem streams, "na rzecz najemcy" tenant
// sales (bezprzetargowo, not an open auction), "wolny lokal mieszkalny"
// (rental vacancy notices). A `.eu` mirror (sandomierz.eu) shares the same
// numeric IDs but is NOT used — the bip.um host is the authoritative source
// per the spike.
//
// `source: 'html'` — the adapter fetches article HTML and extracts text itself.
//
// NOTE (confirm on first CI refresh): the board harvest + pagination were
// verified live (2026-07-10) — `?Page=N` clamps to the last valid page past
// the end (no 404), so crawl.js stops on a repeated page rather than an empty
// one. The body parsers are groundtruthed against real live bodies (verified
// 2026-07-10): flat announcement + its own result (Portowa 18/16, I przetarg,
// 17,08 m², 76 500 zł -> sold 92 000 zł); a second flat announcement + result
// (K.K.Baczyńskiego 9/14, I przetarg, 27,30 m², 99 698 zł -> sold 100 698 zł);
// two land UNSOLD results (Piaski dz. 2133/24, Zaleśnej dz. 816/5); a
// multi-parcel land announcement (Piaski, dz. 2133/10 + 2133/24 in one doc —
// only the first parcel is kept, see parse.js); three real "wykaz ... na
// rzecz najemcy" tenant-sale designations (correctly skipped, never reach an
// auction).

export const config = {
  id: 'sandomierz',
  teryt: '260901_1', // gmina miejska Sandomierz (powiat sandomierski) — LIVE web lookup (GUS TERYT 2609011), confirm on first geoportal run
  label: 'Sandomierz',
  voivodeship: 'swietokrzyskie',
  authority: 'Urząd Miejski w Sandomierzu',
  host: 'bip.um.sandomierz.pl',
  source: 'html',
};
