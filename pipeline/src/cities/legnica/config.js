// Legnica — Dolnośląskie, miasto na prawach powiatu.
// Municipal flat sales are run by Urząd Miasta Legnicy (Wydział Gospodarki
// Nieruchomościami) and published directly on the city BIP (um.bip.legnica.eu)
// under the "Przetargi na lokale" board. Platform is BIP-E.PL — the same CMS
// used by Gliwice, Zabrze, and Bytom in this repo.
//
// Board:   https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale
// Archive: https://um.bip.legnica.eu/uml/archiwum/3677,Archiwum.html (from 2013)
//
// See SPIKE: spikes/dolnoslaskie/legnica/legnica.md — VERDICT: BUILD Low effort.

export const config = {
  id: 'legnica',
  // TERYT for powiat grodzki Legnica (miasto na prawach powiatu, woj. dolnośląskie).
  // Code 0261 is the standard GUS/TERYT code for Legnica powiat grodzki.
  // Confirm on first geoportal run — ULDK uses the gmina-level TERYT; the
  // powiat-grodzki code (026101) should resolve city parcels directly.
  teryt: '026101_1', // gmina TERYT for Legnica — confirm on first geoportal run
  label: 'Legnica',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miasta Legnicy (Wydział Gospodarki Nieruchomościami)',
  host: 'um.bip.legnica.eu',
  source: 'html',
};
