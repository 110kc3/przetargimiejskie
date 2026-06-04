// Mysłowice — municipal flat *sales* are run by Prezydent Miasta Mysłowice and
// announced on the city FINN-BIP (bip.myslowice.pl); the housing manager MZGK
// (Miejski Zarząd Gospodarki Komunalnej) handles rentals/management, not sales.
// See SPIKE-WAVE2.md "Mysłowice — bip.myslowice.pl + MZGK".
//
// First user of the reusable `core/finn-bip.js` helper (FINN eUrząd platform):
// server-rendered `/artykul/<slug>` announcement pages, round in the title
// ("Ogłoszenie o I przetargu …"), price/area/date in the body. No PDF/OCR.
// Active-listings adapter (the FINN board lists current/upcoming auctions, no
// achieved-price stream) — build-properties classifies past-dated ones
// `archived`, like Sosnowiec/Rybnik/Bielsko.
//
// ⚠️ The live BIP is unreachable from the CI sandbox (serves only a shell to a
// plain fetch). `indexUrls` + the article-link/parse shapes are written to the
// documented FINN structure; VALIDATE + pin the exact category code on the first
// real refresh (GitHub Actions reaches the host).

const ORIGIN = 'https://bip.myslowice.pl';

export const config = {
  id: 'myslowice',
  label: 'Mysłowice',
  authority: 'Urząd Miasta Mysłowice',
  host: 'bip.myslowice.pl',
  source: 'html',
  // FINN-BIP crawl config (consumed by core/finn-bip.js via crawl.js).
  finn: {
    origin: ORIGIN,
    // "Ogłoszenia o przetargach" / "Sprzedaż nieruchomości" category indexes.
    // FINN exposes a category list at /bipkod/<code> and an article search; we
    // harvest article links from these landing pages. Adjust the code(s) once
    // the live category is confirmed (the search page is a robust fallback).
    indexUrls: [
      `${ORIGIN}/bipkod/22550536`,
      `${ORIGIN}/szukaj?szukaj=przetarg+lokalu+mieszkalnego`,
    ],
  },
};
