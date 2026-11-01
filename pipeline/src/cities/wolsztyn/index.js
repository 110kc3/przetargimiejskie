import { makeWokissCity } from '../../core/wokiss-bip.js';

export const wolsztyn = makeWokissCity({
  id: 'wolsztyn',
  teryt: '3029034',
  label: 'Wolsztyn',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Wolsztyn',
  host: 'bip.wolsztyn.pl',
  origin: 'https://bip.wolsztyn.pl',
  boardUrl: 'https://bip.wolsztyn.pl/bip/przetargi/',
});

export default wolsztyn;
