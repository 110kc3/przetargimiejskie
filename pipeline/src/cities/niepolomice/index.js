import { makeMadkomCity } from '../../core/madkom-bip.js';

export const niepolomice = makeMadkomCity({
  id: 'niepolomice',
  teryt: '1219044',
  label: 'Niepołomice',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Niepołomice',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigniepolomice',
});

export default niepolomice;
