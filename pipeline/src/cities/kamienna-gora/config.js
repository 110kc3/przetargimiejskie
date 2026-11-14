
export const config = {
  id: 'kamienna-gora',
  teryt: '020701_1', // gmina miejska Kamienna Góra (powiat kamiennogórski 0207) — confirm ULDK variant on first geoportal run
  label: 'Kamienna Góra',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miasta Kamienna Góra (Burmistrz Miasta Kamienna Góra)',
  host: 'bip.kamiennagora.pl',
  source: 'html', // crawlResultDocs() returns refs with .text already attached
};
