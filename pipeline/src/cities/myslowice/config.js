const ORIGIN = 'https://bip.myslowice.pl';

export const config = {
  id: 'myslowice',
  teryt: '247001_1',
  label: 'Mysłowice',
  voivodeship: "slaskie",
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
