// Mysłowice — municipal flat *sales* are run by Prezydent Miasta Mysłowice and
// announced on the city FINN-BIP (bip.myslowice.pl); the housing manager MZGK
// (Miejski Zarząd Gospodarki Komunalnej) handles rentals/management, not sales.
// See SPIKE-WAVE2.md "Mysłowice — bip.myslowice.pl + MZGK".
//
// First user of the reusable `core/finn-bip.js` helper (FINN eUrząd platform):
// server-rendered `/artykul/<slug>` announcement pages, round in the title
// ("Ogłoszenie o I przetargu …"), price/area/date in the body. No PDF/OCR.
// Active-listings adapter (the FINN board lists current/upcoming auctions plus a
// retained archive, but no achieved-price stream) — build-properties classifies
// past-dated ones `archived`, like Sosnowiec/Rybnik/Bielsko.
//
// VERIFIED LIVE (June 2026, rendered-DOM spike). The two category pages below
// each server-render ALL their child announcement links on a single page (no
// pagination): "Aktualne przetargi" (~23 current items) and "Archiwum
// przetargów" (~128 concluded). Both are themselves /artykul/ pages. The
// announcement links are /artykul/ogloszenie-…; `linkFilter` keeps only the
// flat ("lokal") slugs so we don't fetch every land/garage auction.

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
    indexUrls: [
      `${ORIGIN}/artykul/aktualne-przetargi`,
      `${ORIGIN}/artykul/archiwum-przetargow`,
    ],
    // Flat announcements' slugs all contain "lokal" (e.g.
    // …-na-sprzedaz-lokalu-mieszkalnego-nr-6-…); land/garage ones don't. This
    // prunes the per-article fetch list to flats only.
    linkFilter: /lokal/i,
  },
};
