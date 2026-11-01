import { makeMadkomCity } from '../../core/madkom-bip.js';

export const alwernia = makeMadkomCity({
  id: 'alwernia',
  teryt: '1203014',
  label: 'Alwernia',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Alwernia',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umalwernia',
});

export default alwernia;
