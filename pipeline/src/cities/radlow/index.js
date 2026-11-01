import { makeMadkomCity } from '../../core/madkom-bip.js';

export const radlow = makeMadkomCity({
  id: 'radlow',
  teryt: '1216054',
  label: 'Radłów',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Radłów',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umradlow',
});

export default radlow;
