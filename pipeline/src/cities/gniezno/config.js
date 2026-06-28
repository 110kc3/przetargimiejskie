// Gniezno — municipal flat sales run by Urząd Miejski (Wydział Majątkowy).
// Announcements (ogłoszenia przetargów) + result PDFs are attached to each BIP
// entry at bip.gniezno.eu; result notices (wyniki) are also published as short
// HTML news items on gniezno.eu with cena osiągnięta + nabywca inline.
// BIP uses IDcom.pl CMS — same platform as several other Wielkopolska BIPs.
// Volume: ~6–10 BIP entries/year across all rounds; ~3–6 unique flats/year.
// See spikes/wielkopolskie/powiat-gnieznienski/gniezno.md.

export const config = {
  id: 'gniezno',
  // TERYT for Gmina Miejska Gniezno (gmina miejska, powiat gnieźnieński).
  // TODO: confirm on first geoportal run — provisional from GUS registry.
  teryt: '302101_1',
  label: 'Gniezno',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miasta Gniezna',
  host: 'bip.gniezno.eu',
  source: 'html',
};
