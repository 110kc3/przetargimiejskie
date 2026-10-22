// Będzin (województwo śląskie, powiat będziński) — Gmina Będzin (Urząd Miejski w
// Będzinie, Wydział Gospodarki Nieruchomościami oraz Wydział Gospodarki Mieszkaniowej
// i Komunalnej) sells municipal flats, buildings and land at `przetarg ustny
// nieograniczony` and publishes announcements + achieved-price results on the
// city BIP (bedzin.bip.info.pl). See spikes/slaskie/powiat-bedzinski/bedzin.md.
//
// Shape (bip.info.pl hosted CMS — same platform family as Lubliniec and Zgorzelec):
// server-rendered HTML with attached PDFs / docs where applicable.
// Main boards:
//   ANNOUNCEMENTS (Nieruchomości):   https://bedzin.bip.info.pl/index.php?idmp=943&r=r (sub-board of 450)
//   ANNOUNCEMENTS (Mieszkania):      https://bedzin.bip.info.pl/index.php?idmp=35&r=r
//   WYKAZY:                          https://bedzin.bip.info.pl/index.php?idmp=944&r=r
//   RESULTS (Archiwum):              https://bedzin.bip.info.pl/index.php?idmp=484&r=r
//   RESULTS (Wyniki):                https://bedzin.bip.info.pl/index.php?idmp=945&r=r
//
// `source: 'html'` — the adapter fetches HTML and attachment text itself and hands
// each result ref a ready `.text` blob (built by parse.buildRecordText), so the
// refresh loop's OCR / pdf-text dispatch is bypassed.

export const config = {
  id: 'bedzin',
  teryt: '240101_1', // gmina miejska Będzin (powiat będziński 2401, gmina-type 1)
  label: 'Będzin',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Będzina',
  host: 'bedzin.bip.info.pl',
  source: 'html',
};
