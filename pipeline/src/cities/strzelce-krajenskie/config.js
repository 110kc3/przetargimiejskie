// Strzelce Krajeńskie — Lubuskie, powiat strzelecko-drezdenecki (gmina
// miejsko-wiejska). Municipal property sales (incl. lokale mieszkalne) are
// run by the Referat Gospodarki Przestrzennej i Mienia (GPM) of the Urząd
// Miejski and published on the city BIP (bip.strzelce.pl), which runs
// SYSTEMDOBIP.PL / E-LINE — the SAME CMS + engine as gorzow-wielkopolski and
// miedzyrzecz (both same-voivodeship, already-built adapters).
//
//   Announcements (ogłoszone):     https://bip.strzelce.pl/przetargi/29/status/0/
//   Resolved (rozstrzygnięte):     https://bip.strzelce.pl/przetargi/29/status/1/
//
// See spike: spikes/lubuskie/powiat-strzelecko-drezdenecki/strzelce-krajenskie.md

export const config = {
  id: 'strzelce-krajenskie',
  // Gmina miejsko-wiejska Strzelce Krajeńskie, powiat strzelecko-drezdenecki,
  // woj. lubuskie. Powiat TERYT "0806" confirmed live (web search against
  // eteryt/GUS-adjacent registries, 2026-07-11). Gmina number "04" INFERRED,
  // not directly confirmed: eteryt exposes a "0806045" sub-code labelled
  // "obszar wiejski" (the rural-area split of a miejsko-wiejska gmina, rodzaj
  // digit 5) — "04" also matches Strzelce Krajeńskie's alphabetical position
  // among the powiat's five gminy (Dobiegniew, Drezdenko, Stare Kurowo,
  // Strzelce Krajeńskie, Zwierzyn). Rodzaj "3" here = the WHOLE gmina
  // miejsko-wiejska (combined), not the wieś/miasto split. MEDIUM confidence
  // — confirm on first geoportal run.
  teryt: '080604_3',
  label: 'Strzelce Krajeńskie',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miejski w Strzelcach Krajeńskich',
  host: 'bip.strzelce.pl',
  source: 'html',
};
