import { makeWokissCity } from '../../core/wokiss-bip.js';

export const puszczykowo = makeWokissCity({
  id: 'puszczykowo',
  teryt: '3021021',
  label: 'Puszczykowo',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Puszczykowo',
  host: 'bip.puszczykowo.pl',
  origin: 'https://bip.puszczykowo.pl',
  boardUrl: 'https://bip.puszczykowo.pl/bip/przetargi/',
});

export default puszczykowo;
