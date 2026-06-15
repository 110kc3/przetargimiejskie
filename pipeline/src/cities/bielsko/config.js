// Bielsko-Biała — the largest uncovered Silesian city. Municipal flat *sales*
// are run by the City Hall (Urząd Miejski, Wydział Mienia Gminnego), NOT by
// ZGM Bielsko-Biała (which only does rentals + procurement). Offers are
// published on a purpose-built, server-rendered Drupal marketplace, the
// **Giełda Nieruchomości**. See SPIKE-WAVE2.md "Bielsko-Biała".
//
// `source: 'html'` — crawlActive does its own fetch + HTML parse, so the refresh
// loop's OCR/pdf-text dispatch is bypassed and crawlResultDocs() is []. Active +
// archived-mode adapter (like Sosnowiec/Rybnik): the giełda shows only current /
// pending offers, so there is no sold-price stream; build-properties classifies
// past-dated offers `archived`.

export const config = {
  id: 'bielsko',
  teryt: '246101_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Bielsko-Biała',
  authority: 'Urząd Miejski w Bielsku-Białej',
  host: 'bielsko-biala.pl',
  source: 'html',
};
