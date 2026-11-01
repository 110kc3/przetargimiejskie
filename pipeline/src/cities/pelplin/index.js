import { makeMadkomCity } from '../../core/madkom-bip.js';

export const pelplin = makeMadkomCity({
  id: 'pelplin',
  teryt: '2214044',
  label: 'Pelplin',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Pelplin',
  host: 'bip.pelplin.pl',
  origin: 'https://bip.pelplin.pl',
  context: 'default',
});

export default pelplin;
