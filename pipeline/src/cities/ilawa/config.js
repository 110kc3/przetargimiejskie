// Iława — gmina miejska (miasto), województwo warmińsko-mazurskie, powiat iławski.
// Municipal property auctions are conducted by Burmistrz Miasta Iławy.
// Official BIP: bip.umilawa.pl (systemdobip.pl platform).
//
// The city sells residential flats (lokale mieszkalne), residential buildings
// (budynki mieszkalne), commercial properties, and land plots.
// Announcements and result notices are published on the same section board:
//   /77/Przetargi_-_mienie_komunalne/
// Concluded result notices carry attached .doc/.docx/PDF documents disclosing
// outcomes, achieved prices, and buyers.

export const config = {
  id: 'ilawa',
  teryt: '280701_1', // gmina miejska Iława (powiat iławski) — confirm on first geoportal run
  label: 'Iława',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Miasta Iławy',
  host: 'bip.umilawa.pl',
  source: 'html',
};
