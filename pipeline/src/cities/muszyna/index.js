import { makeMadkomCity } from '../../core/madkom-bip.js';

export const muszyna = makeMadkomCity({
  id: 'muszyna',
  teryt: '1210114',
  label: 'Muszyna',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Muszyna',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigmuszyna',
});

export default muszyna;
