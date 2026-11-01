import { makeMadkomCity } from '../../core/madkom-bip.js';

export const skawina = makeMadkomCity({
  id: 'skawina',
  teryt: '1206114',
  label: 'Skawina',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Skawina',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigskawina',
});

export default skawina;
