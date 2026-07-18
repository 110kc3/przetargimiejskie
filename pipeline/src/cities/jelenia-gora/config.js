// Jelenia Góra — Dolnośląskie, miasto na prawach powiatu. Municipal flat/land/
// commercial-unit sales are run by the Prezydent Miasta (Wydział Geodezji i
// Gospodarki Nieruchomościami) and published solely on the city BIP
// (bip.jeleniagora.pl) — ZGKiM manages the housing stock but publishes no
// auctions of its own (its separate zgkim.bip.jeleniagora.pl BIP is out of
// scope). See spikes/dolnoslaskie/jelenia-gora/jelenia-gora.md — VERDICT:
// BUILD (2026-06-27).
//
// CMS: Logonet eUrząd v2.9.0 — same vendor as tarnowskie-gory / kedzierzyn-kozle
// / skarzysko-kamienna. See crawl.js for the URL shapes and the (live-verified)
// XML-feed quirk that makes enumeration a single cheap fetch per board.

export const config = {
  id: 'jelenia-gora',
  // gmina miejska Jelenia Góra (miasto na prawach powiatu, woj. dolnośląskie):
  // woj 02 + powiat grodzki 62 + gmina serial 01 + rodzaj 1 (miejska), following
  // the same convention as legnica (026101_1) / wroclaw (026401_1) / walbrzych
  // (026501_1) in this repo. Confirm on first geoportal run.
  teryt: '026201_1',
  label: 'Jelenia Góra',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Jeleniej Góry',
  host: 'bip.jeleniagora.pl',
  source: 'html',
};
