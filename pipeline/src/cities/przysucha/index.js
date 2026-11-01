import { makeMadkomCity } from '../../core/madkom-bip.js';

export const przysucha = makeMadkomCity({
  id: 'przysucha',
  teryt: '1423064',
  label: 'Przysucha',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Przysucha',
  host: 'bip.gminaprzysucha.pl',
  origin: 'https://bip.gminaprzysucha.pl',
  context: 'default',
});

export default przysucha;
