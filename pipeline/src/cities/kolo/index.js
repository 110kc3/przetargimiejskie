import { makeLogonetCity } from '../../core/logonet-bip.js';

export const kolo = makeLogonetCity({
  id: 'kolo',
  teryt: '3009011',
  label: 'Koło',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Koło',
  host: 'bip.kolo.pl',
  origin: 'https://bip.kolo.pl',
  boardUrl: 'https://bip.kolo.pl/przetargi-nieruchomosci/1162',
});

export default kolo;
