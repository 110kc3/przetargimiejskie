import { makeWokissCity } from '../../core/wokiss-bip.js';

export const kostrzyn = makeWokissCity({
  id: 'kostrzyn',
  teryt: '3021084',
  label: 'Kostrzyn',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Kostrzyn',
  host: 'bip3.wokiss.pl',
  origin: 'https://bip3.wokiss.pl',
  boardUrl: 'https://bip3.wokiss.pl/kostrzyn/',
});

export default kostrzyn;
