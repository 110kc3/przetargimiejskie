// Nowa Sól (Lubuskie, powiat nowosolski) — municipal flat sales run by
// Gmina Nowa Sól-Miasto, Wydział Gospodarki Nieruchomościami.
//
// Source: nowasol.pl/przetargi — WordPress 6.7.5, server-rendered, no auth.
// Individual listing URL pattern:
//   https://nowasol.pl/przetargi/przetarg/{slug}/{YYYY-MM-DD}
// Index pagination: https://nowasol.pl/przetargi/page/N
//
// Each listing page contains one structured HTML <table> with columns:
//   Lp. | KW Nr | Opis nieruchomości | Opis lokalu | Cena wywoławcza | Wadium
//
// Result / achieved-price stream:
//   NOT available on nowasol.pl/przetargi (announcements only).
//   Required by law (art. 12 ugn) to appear on the same board ≥7 days.
//   bip.nowasol.pl returned empty body on fetch (likely JS-gated BIP).
//   crawlResultDocs() ships as a stub returning [] until the BIP can be
//   reached or results appear as separate WordPress posts on the same board.
//   Fallback: check same WordPress list for "informacja o wyniku" items on
//   the first live CI refresh.
//
// Volume: ~1–2 lokal mieszkalny auctions/month (some flats re-auctioned 2–3×).
// Spike live-verified: 2026-06-29. VERDICT: BUILD (low effort).

export const config = {
  id: 'nowa-sol',
  // TERYT gmina miejska Nowa Sól (powiat nowosolski, lubuskie).
  // Code 0808011 — confirm on first geoportal run.
  teryt: '0808011',
  label: 'Nowa Sól',
  voivodeship: 'lubuskie',
  authority: 'Gmina Nowa Sól-Miasto',
  host: 'nowasol.pl',
  source: 'html',
};
