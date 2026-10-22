// Szamotuły (województwo wielkopolskie, powiat szamotulski)
// Gmina miejsko-wiejska Szamotuły — Burmistrz Miasta i Gminy Szamotuły
//
// Platform: React SPA + Symfony REST API (eBIP-style).
// Single mixed board (menu 1247 "Przetargi") carries both announcements
// (przetarg ustny nieograniczony) and achieved-price results (informacja o wyniku).
//
// See spikes/wielkopolskie/powiat-szamotulski/szamotuly.md.

export const config = {
  id: 'szamotuly',
  teryt: '3024074', // Miasto Szamotuły (3024074) / Gmina miejsko-wiejska Szamotuły (3024073) — confirm on first geoportal run
  label: 'Szamotuły',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta i Gminy Szamotuły',
  host: 'bip.szamotuly.pl',
  source: 'html',
};
