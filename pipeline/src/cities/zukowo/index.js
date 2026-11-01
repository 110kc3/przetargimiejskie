import { makeMadkomCity } from '../../core/madkom-bip.js';

export const zukowo = makeMadkomCity({
  id: 'zukowo',
  teryt: '2205084',
  label: 'Żukowo',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Żukowo',
  host: 'bip.zukowo.pl',
  origin: 'https://bip.zukowo.pl',
  context: 'default',
});

export default zukowo;
