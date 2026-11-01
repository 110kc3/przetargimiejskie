import { makeWokissCity } from '../../core/wokiss-bip.js';

export const klecko = makeWokissCity({
  id: 'klecko',
  teryt: '3003054',
  label: 'Kłecko',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Kłecko',
  host: 'bip.klecko.pl',
  origin: 'https://bip.klecko.pl',
  boardUrl: 'https://bip.klecko.pl/bip/przetargi/',
});

export default klecko;
