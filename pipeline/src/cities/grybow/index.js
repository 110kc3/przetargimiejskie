import { makeMadkomCity } from '../../core/madkom-bip.js';

export const grybow = makeMadkomCity({
  id: 'grybow',
  teryt: '1210011',
  label: 'Grybów',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Grybów',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umgrybow',
});

export default grybow;
