import { makeMadkomCity } from '../../core/madkom-bip.js';

export const skarszewy = makeMadkomCity({
  id: 'skarszewy',
  teryt: '2213094',
  label: 'Skarszewy',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Skarszewy',
  host: 'bip.skarszewy.pl',
  origin: 'https://bip.skarszewy.pl',
  context: 'default',
});

export default skarszewy;
