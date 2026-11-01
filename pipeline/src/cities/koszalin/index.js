import { makeLogonetCity } from '../../core/logonet-bip.js';

export const koszalin = makeLogonetCity({
  id: 'koszalin',
  teryt: '3261011',
  label: 'Koszalin',
  voivodeship: 'zachodniopomorskie',
  authority: 'Burmistrz Miasta Koszalin',
  host: 'bip.koszalin.pl',
  origin: 'https://bip.koszalin.pl',
  boardUrl: 'https://bip.koszalin.pl/przetargi-nieruchomosci/1677',
});

export default koszalin;
