// Płońsk (województwo mazowieckie, powiat płoński, gmina miejska) —
// Burmistrz Miasta Płońska (Wydział Planowania Przestrzennego i Gospodarki Nieruchomościami)
// sells municipal flats, buildings and land at public oral auctions
// ("przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego").
//
// Sources:
//   Primary BIP: https://umplonsk.bip.org.pl/id/1999 (Przetargi parent node)
//   Per-year boards:
//     - 2026: https://umplonsk.bip.org.pl/id/2602
//     - 2025: https://umplonsk.bip.org.pl/id/2482
//     - 2024: https://umplonsk.bip.org.pl/id/2407
//     - 2023: https://umplonsk.bip.org.pl/id/2234
//     - 2022: https://umplonsk.bip.org.pl/id/2131
//     - 2021: https://umplonsk.bip.org.pl/id/2000
//
// Results ("Informacja o wyniku przetargu") are published as attachments on the same
// per-year boards. Attachments are mixed .docx and .pdf (both born-digital and scanned).
//
// Housing manager ZGM Płońsk (zgmplonsk.bip.gov.pl) only manages rentals/administration;
// sales are run solely by the town hall (UM Płońsk).
//
// Spike: spikes/mazowieckie/powiat-plonski/plonsk.md (VERDICT: BUILD, Medium effort).
// TERC: 1420011, SIMC: 0930800.

export const config = {
  id: 'plonsk',
  teryt: '1420011', // gmina miejska Płońsk (powiat płoński) — confirm on first geoportal run
  label: 'Płońsk',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Miasta Płońska (Gmina Miasto Płońsk)',
  host: 'umplonsk.bip.org.pl',
  source: 'html',
};
