// Sulęcin — Lubuskie, gmina miejsko-wiejska, powiat sulęciński (seat: town Sulęcin).
// Municipal property sales (flats + land) run through Burmistrz Sulęcina and are
// published on the city BIP (bip.sulecin.pl), the SYSTEMDOBIP.PL / E-LINE SYSTEMY
// INTERNETOWE CMS — the same platform family as the already-built lubuskie
// adapters gorzow-wielkopolski and miedzyrzecz, but Sulęcin's actual property
// board is the GENERIC numeric "Lista informacji" board (matches gorzow's own
// /509/ results-board shape), not the specialized /przetargi/<id>/status/<n>/
// tabular engine gorzow (announcements) and miedzyrzecz (both streams) use —
// that engine exists on this BIP too (bip.sulecin.pl/przetargi/0/status/0/) but
// is currently empty and, per its own "Rodzaj" filter, appears scoped to a
// different sub-workflow, not the sale boards actually carrying the flat/land
// notices. See crawl.js for the live-verified board list.
//
// See spike: spikes/lubuskie/powiat-sulecinski/sulecin.md

export const config = {
  id: 'sulecin',
  // Gmina miejsko-wiejska Sulęcin, powiat sulęciński, woj. lubuskie (08).
  // DERIVED (not GUS-API-verified) from the town's own Wikipedia infobox TERYT
  // value "0807044" (woj 08, powiat 07, gmina 04, rodzaj 4 = "miasto" part of a
  // miejsko-wiejska gmina) — the whole-gmina aggregate code swaps rodzaj 4→3.
  // Medium confidence: sourced from a live lookup (not pure recollection like
  // the gorzow/miedzyrzecz placeholders), but not cross-checked against the
  // authoritative GUS TERYT registry or ULDK. Confirm on first geoportal run.
  teryt: '080704_3',
  label: 'Sulęcin',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miejski w Sulęcinie',
  host: 'bip.sulecin.pl',
  source: 'html',
};
