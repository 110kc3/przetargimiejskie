import { makeMadkomCity } from '../../core/madkom-bip.js';

export const limanowa = makeMadkomCity({
  id: 'limanowa',
  teryt: '1207011',
  label: 'Limanowa',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Limanowa',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umlimanowa',
});

export default limanowa;
