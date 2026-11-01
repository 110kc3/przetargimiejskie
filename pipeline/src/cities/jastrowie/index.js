import { makeWokissCity } from '../../core/wokiss-bip.js';

export const jastrowie = makeWokissCity({
  id: 'jastrowie',
  teryt: '3031024',
  label: 'Jastrowie',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Jastrowie',
  host: 'bip3.wokiss.pl',
  origin: 'https://bip3.wokiss.pl',
  boardUrl: 'https://bip3.wokiss.pl/jastrowie/',
});

export default jastrowie;
