import { makeMadkomCity } from '../../core/madkom-bip.js';

export const koszyce = makeMadkomCity({
  id: 'koszyce',
  teryt: '1214024',
  label: 'Koszyce',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Koszyce',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'ugkoszyce',
});

export default koszyce;
