// Końskie (Świętokrzyskie, powiat konecki) — Miasto i Gmina Końskie.
// Auctions lokale mieszkalne via ustny przetarg nieograniczony directly through
// the city BIP (bip.umkonskie.pl), managed by Wydział Gospodarki Nieruchomościami,
// Burmistrz Miasta i Gminy Końskie. Platform: IDcom.pl (bip-v1 instance, site ID
// 46779); static attachments on bip-v1-files.idcom-jst.pl — same engine as the
// already-built Giżycko and Tczew adapters. Board 5027 mixes flats, land and
// lease notices in one feed (see crawl.js); this adapter is scoped to flats
// only. Volume: lowest tier — roughly 2-3 auction events/year, single flat at a
// time, several rounds end negative (0 events in 2024).
// Closest analogs: Tczew (text-PDF results, parseable) + Giżycko (board-walk
// shape); cloned from both.
// See spikes/swietokrzyskie/powiat-konecki/konskie.md.

export const config = {
  id: 'konskie',
  // TERYT for Gmina Końskie (gmina miejsko-wiejska, powiat konecki [26 05],
  // woj. świętokrzyskie [26]). Gmina number within the powiat assumed '01'
  // (the powiat-seat town, following the same-voivodeship busko-zdroj pattern:
  // '260101_3'). TODO: confirm on first geoportal run — provisional from GUS
  // registry numbering, not fetched live.
  teryt: '260501_3',
  label: 'Końskie',
  voivodeship: 'swietokrzyskie',
  authority: 'Miasto i Gmina Końskie',
  host: 'bip.umkonskie.pl',
  source: 'html', // crawl.js fetches the PDF itself (pdfText); refresh.js uses ref.text
};
