import { makeWokissCity } from '../../core/wokiss-bip.js';

export const kornik = makeWokissCity({
  id: 'kornik',
  teryt: '3021094',
  label: 'Kórnik',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Kórnik',
  host: 'bip.kornik.pl',
  origin: 'https://bip.kornik.pl',
  boardUrl: 'https://bip.kornik.pl/bip/przetargi/',
});

export default kornik;
