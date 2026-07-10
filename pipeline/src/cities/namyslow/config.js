// Namysłów (Opolskie, powiat namysłowski) — municipal flat sales run by the
// housing manager ZAN Sp. z o.o. (Zakład Administracji Nieruchomości,
// ex-ADM-TBS, rebranded 2011), NOT the gmina BIP.
//
// Source: zan-namyslow.pl/przetargi/ — WordPress (Divi theme), server-rendered,
// no auth.  The board is a paginated, reverse-chronological list mixing
// flat-sale announcements with unrelated notices (procurement RFQs, garage
// rentals, building-renovation tenders + their "zawiadomienie o wyborze
// oferty" award notices) — see crawl.js/parse.js for the title-based filter.
//
// Each flat-sale post carries the FULL notice inline as born-digital HTML
// prose (address, powierzchnia użytkowa, cena wywoławcza, data przetargu, nr
// księgi wieczystej) plus a born-digital backup PDF ("Ogłoszenie o
// przetargu") and a "Regulamin sprzedaży" PDF (sale rules only — not parsed).
//
// The Gmina Namysłów BIP (bip.namyslow.eu — land + wykaz + wynik stream) and
// the county Starostwo BIP (bip.namyslow.pl — a SEPARATE JST) are both out of
// scope; see spikes/opolskie/powiat-namyslowski/namyslow.md.
//
// No dedicated flat RESULTS board on ZAN — its "zawiadomienie o wyborze
// oferty" posts are for renovation-contractor procurement, not flat-sale
// outcomes. crawlResultDocs() is a stub (see crawl.js header) — achieved
// prices are only inferable from repeat-round history.
//
// Volume: modest-recurring — live-verified 2026-07-10, a small rotating pool
// of ~5 municipal flats cycling through repeat rounds (I..V observed across
// the last ~6 months of posts) plus the occasional new listing.
// Spike live-verified 2026-07-08 (BUILD, Low-Medium effort); re-verified live
// 2026-07-10 during build (3 flats still active: Jana Pawła II 5A/2 round IV,
// Boh. Warszawy 7/8 round III, + the round III predecessor of 5A/2 still
// published past-dated).

export const config = {
  id: 'namyslow',
  // TERYT gmina miejsko-wiejska Namysłów (powiat namysłowski 1610, opolskie).
  // Code 161001_4 — confirm on first geoportal run.
  teryt: '161001_4',
  label: 'Namysłów',
  voivodeship: 'opolskie',
  authority: 'ZAN Sp. z o.o. (Zakład Administracji Nieruchomości) w Namysłowie',
  host: 'zan-namyslow.pl',
  source: 'html',
};
