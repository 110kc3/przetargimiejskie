// Łódź (województwo łódzkie, miasto na prawach powiatu) — the city
// (Prezydent Miasta Łodzi, Wydział Zbywania i Nabywania Nieruchomości in
// Departament Gospodarowania Majątkiem) auctions municipal flats, commercial
// units AND land via the city BIP at bip.uml.lodz.pl (TYPO3 CMS).
//
// High-volume stream: ~30–60 individual flat lots per month, making this one
// of the highest-volume municipal flat-auction cities in Poland. All notices
// are server-rendered HTML. Each batch article carries:
//   - An announcement PDF ("Treść ogłoszenia [.pdf]") — born-digital table
//     with address, KW, obręb/działka, area, share, starting price, wadium.
//   - A result PDF ("Informacja o wynikach przetargów [.pdf]") — added to the
//     same article AFTER the auction; per-lot achieved price or negative result.
//
// The /ostatnio-dodane/ feed publishes "Wyniki…" articles that link BACK to
// the archived announcement article (not a standalone result HTML page).
//
// `source: 'html'` — crawl.js fetches PDFs directly via pdfText(); result
// refs carry `.text` so refresh.js skips its own OCR/pdf-text dispatch.
//
// TERYT: Łódź grodzki (city-county, powiat 1061) → unit code 1061000000.
// NOTE: confirm TERYT on first geoportal run.
//
// Archive URL for 2026: /sprzedaz-nieruchomosci-archiwum-2024-r-1-1/
// (the TYPO3 slug was generated from "2024 r." when the node was created and
// not updated — confirmed live 2026-06-27.)

export const config = {
  id: 'lodz',
  teryt: '1061000000', // confirm on first geoportal run
  label: 'Łódź',
  voivodeship: 'lodzkie',
  authority: 'Urząd Miasta Łodzi (Wydział Zbywania i Nabywania Nieruchomości)',
  host: 'bip.uml.lodz.pl',
  source: 'html',
};
