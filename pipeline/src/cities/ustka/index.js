import { makeMadkomCity } from '../../core/madkom-bip.js';

export const ustka = makeMadkomCity({
  id: 'ustka',
  teryt: '2212011',
  label: 'Ustka',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Ustka',
  host: 'bip.um.ustka.pl',
  origin: 'https://bip.um.ustka.pl',
  context: 'default',
});

export default ustka;
