import { makeMadkomCity } from '../../core/madkom-bip.js';

export const chelmek = makeMadkomCity({
  id: 'chelmek',
  teryt: '1213034',
  label: 'Chełmek',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Chełmek',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umchelmek',
});

export default chelmek;
