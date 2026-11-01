import { makeWokissCity } from '../../core/wokiss-bip.js';

export const szamocin = makeWokissCity({
  id: 'szamocin',
  teryt: '3001054',
  label: 'Szamocin',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Szamocin',
  host: 'bip.gminaszamocin.pl',
  origin: 'https://bip.gminaszamocin.pl',
  boardUrl: 'https://bip.gminaszamocin.pl/bip/przetargi/',
});

export default szamocin;
