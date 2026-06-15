// Myslowice -- municipal flat sales are run by Prezydent Miasta Myslowice.
// First user of the reusable core/finn-bip.js helper (FINN eUrzad platform).

const ORIGIN = 'https://bip.myslowice.pl';

export const config = {
  id: 'myslowice',
  teryt: '247001_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Mysłowice',
  authority: 'Urząd Miasta Mysłowice',
  host: 'bip.myslowice.pl',
  source: 'html',
  finn: {
    origin: ORIGIN,
    indexUrls: [
      `${ORIGIN}/artykul/aktualne-przetargi`,
      `${ORIGIN}/artykul/archiwum-przetargow`,
    ],
    linkFilter: /lokal|niezabudow|zabudow|uzytkow|dzialk|grunt/i,
  },
};
