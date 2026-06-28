// Tczew (Pomorskie, powiat tczewski) — Gmina Miejska Tczew.
// Auctions lokale mieszkalne via ustny przetarg nieograniczony directly through
// the city BIP (bip.tczew.pl), managed by Wydział Gospodarki Nieruchomościami.
// Platform: IDcom.pl (bip-v1 instance); static attachments on bip-v1-files.idcom-jst.pl.
// Volume: ~2–5 flats/year. Result notices with achieved price are PDF attachments
// (text-PDF, parseable). No auth, no SPA, no bot-block.
// Closest analog: Bytom (small-volume, city-BIP-only, IDcom.pl platform).
// See spikes/pomorskie/powiat-tczewski/tczew.md.

export const config = {
  id: 'tczew',
  // TERYT for Gmina Miejska Tczew (gmina miejska, powiat tczewski, woj. pomorskie).
  // Confirm on first geoportal run.
  teryt: '226101_1',
  label: 'Tczew',
  voivodeship: 'pomorskie',
  authority: 'Gmina Miejska Tczew',
  host: 'bip.tczew.pl',
  source: 'html',
};
