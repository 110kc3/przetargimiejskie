
export const config = {
  id: 'walbrzych',
  teryt: '0265011', // TERYT Gminy confirmed from BIP footer; confirm ULDK variant on first run
  label: 'Wałbrzych',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miejski w Wałbrzychu',
  host: 'bip.um.walbrzych.pl',
  source: 'html', // crawlResultDocs() returns refs with .text already attached
  // A complete hosted refresh finished in 6m41s on 31 August 2026, safely
  // inside the 20-minute production step deadline. Run it in the normal matrix.
};
