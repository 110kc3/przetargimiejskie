import { makeMadkomCity } from '../../core/madkom-bip.js';

export const slomniki = makeMadkomCity({
  id: 'slomniki',
  teryt: '1206124',
  label: 'Słomniki',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Słomniki',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umslomniki',
});

export default slomniki;
