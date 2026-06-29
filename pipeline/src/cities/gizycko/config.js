// Giżycko (Warmińsko-Mazurskie, powiat giżycki) — Gmina Miejska Giżycko.
// Auctions lokale mieszkalne via ustny przetarg nieograniczony directly through
// the city BIP (bip.gizycko.pl), managed by Wydział Gospodarki Nieruchomościami.
// Platform: IDcom.pl (bip-v1 instance, site ID 3080); static attachments on
// bip-v1-files.idcom-jst.pl. Volume: ~4–6 flat notices/year (often same flat
// re-run 2–5 times). Announcement body is full HTML — no OCR needed for active
// listings. Result PDFs are scanned image files (Xerox WorkCentre 7225) —
// pdftotext returns empty; parseResultDoc always returns [].
// Closest analog: Tczew (same IDcom engine, city-BIP-only, low volume).
// See spikes/warminsko-mazurskie/powiat-gizycki/gizycko.md.

export const config = {
  id: 'gizycko',
  // TERYT for Gmina Miejska Giżycko (gmina miejska, powiat giżycki, woj. warmińsko-mazurskie).
  // TODO: confirm on first geoportal run — provisional from GUS registry.
  teryt: '281401_1',
  label: 'Giżycko',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Gmina Miejska Giżycko',
  host: 'bip.gizycko.pl',
  source: 'html',
};
