import { makeWokissCity } from '../../core/wokiss-bip.js';

export const budzyn = makeWokissCity({
  id: 'budzyn',
  teryt: '3001024',
  label: 'Budzyń',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Budzyń',
  host: 'bip.budzyn.pl',
  origin: 'https://bip.budzyn.pl',
  boardUrl: 'https://bip.budzyn.pl/bip/przetargi/',
});

export default budzyn;
