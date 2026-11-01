import { makeWokissCity } from '../../core/wokiss-bip.js';

export const golina = makeWokissCity({
  id: 'golina',
  teryt: '3010014',
  label: 'Golina',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Golina',
  host: 'bip3.wokiss.pl',
  origin: 'https://bip3.wokiss.pl',
  boardUrl: 'https://bip3.wokiss.pl/golina/',
});

export default golina;
