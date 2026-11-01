import { makeMadkomCity } from '../../core/madkom-bip.js';

export const bytow = makeMadkomCity({
  id: 'bytow',
  teryt: '2201024',
  label: 'Bytów',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Bytów',
  host: 'bip.bytow.pl',
  origin: 'https://bip.bytow.pl',
  context: 'default',
});

export default bytow;
