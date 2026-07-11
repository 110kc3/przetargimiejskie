// Środa Wielkopolska — municipal property sales run directly by the Urząd
// Miejski (Burmistrz Miasta Środa Wielkopolska, Wydział Geodezji i Gospodarki
// Przestrzennej) via przetarg ustny (nieograniczony/ograniczony). Published
// on the city BIP bip.umsroda.pl — IDcom.pl hosted CMS, same platform family
// as gniezno/tczew/gizycko (same voivodeship as gniezno — the build's clone
// analog). Land-dominated stream (mostly nieruchomości niezabudowane near
// ul. Lotnicza) with flats cycling through as a minority (Górki 7/2,
// Westerplatte 9/13, Daszyńskiego 20/14, Sejmikowa 2/5, Kilińskiego 20/7
// confirmed live). See spikes/wielkopolskie/powiat-sredzki/sroda-wielkopolska.md.

export const config = {
  id: 'sroda-wielkopolska',
  // TERYT for Gmina Środa Wielkopolska (gmina miejsko-wiejska, powiat
  // średzki, woj. wielkopolskie). 302504_3 = the WHOLE miejsko-wiejska gmina
  // (rodzaj 3) — chosen over the _4 "miasto" sub-code because auctions on
  // this board span both the town AND its villages (e.g. Chocicza,
  // Jarosławiec are real live fixtures, not just in-town addresses).
  // LOW CONFIDENCE: derived from a web search against a third-party TERYT
  // mirror (romek.info), NOT cross-checked against a live geoportal parcel
  // lookup or the official GUS eTeryt registry. TODO: confirm on first
  // geoportal run.
  teryt: '302504_3',
  label: 'Środa Wielkopolska',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miejski w Środzie Wielkopolskiej',
  host: 'bip.umsroda.pl',
  source: 'html',
};
