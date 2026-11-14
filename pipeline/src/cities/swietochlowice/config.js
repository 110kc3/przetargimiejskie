const ORIGIN = 'https://www.bip.swietochlowice.pl';

export const config = {
  id: 'swietochlowice',
  teryt: '247601_1',
  label: 'Świętochłowice',
  voivodeship: "slaskie",
  authority: 'Urząd Miejski w Świętochłowicach',
  host: 'bip.swietochlowice.pl',
  source: 'html',
  bip: {
    origin: ORIGIN,
    listPath: '/bipkod/29287911',
    maxArchivePages: 45,
    siblingPaths: [
      '/bipkod/003/010/003',
      '/bipkod/42668516',
    ],
    maxSiblingArchivePages: 30,
  },
};
