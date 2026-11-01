import { makeMadkomCity } from '../../core/madkom-bip.js';

export const gorlice = makeMadkomCity({
  id: 'gorlice',
  teryt: '1205011',
  label: 'Gorlice',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Gorlice',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umgorlice',
});

export default gorlice;
