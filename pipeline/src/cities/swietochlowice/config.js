// Swietochlowice -- municipal flat sales published on the city BIP (Liferay portal).

const ORIGIN = 'https://www.bip.swietochlowice.pl';

export const config = {
  id: 'swietochlowice',
  teryt: '247601_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Świętochłowice',
  voivodeship: "slaskie",
  authority: 'Urząd Miejski w Świętochłowicach',
  host: 'bip.swietochlowice.pl',
  source: 'html',
  // The shared FINN origin historically dropped Azure traffic, but a full
  // hosted refresh succeeded on 31 August 2026. It now runs in the normal
  // matrix; health/triage will surface any recurrence.
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
