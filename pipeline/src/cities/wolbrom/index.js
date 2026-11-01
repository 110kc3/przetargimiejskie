import { makeMadkomCity } from '../../core/madkom-bip.js';

export const wolbrom = makeMadkomCity({
  id: 'wolbrom',
  teryt: '1212074',
  label: 'Wolbrom',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Wolbrom',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigwolbrom',
});

export default wolbrom;
