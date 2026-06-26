// Rybnik — municipal flat sales are run by ZGM (Zakład Gospodarki Mieszkaniowej),
// the city's dedicated housing manager, and published on its BIP
// (bip.zgm.rybnik.pl) under "Sprzedaż lokali mieszkalnych → Ogłoszenie o
// przetargach". See SPIKE-WAVE2.md "Rybnik".
//
// Shape: a server-rendered ASP.NET BIP. Each flat auction is an "OGŁOSZENIE
// <address> [rtf]" link (Download.ashx?id=…); older batches hang off
// `&Archive=<id>` links. The adapter crawls the current page + archive batches,
// downloads each RTF and decodes it (core/rtf-text.js, pure JS) to read
// price/area/date/round; the address comes from the link label.
//
// `source: 'html'` — the adapter does its own fetch + RTF extraction inside
// crawlActive, so the refresh loop's OCR/pdf dispatch is bypassed and
// crawlResultDocs() is []. Active-listings adapter (no achieved-price stream).

export const config = {
  id: 'rybnik',
  teryt: '247301_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Rybnik',
  voivodeship: "slaskie",
  authority: 'ZGM Rybnik',
  host: 'bip.zgm.rybnik.pl',
  source: 'html',
};
