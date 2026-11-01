import { makeMadkomCity } from '../../core/madkom-bip.js';

export const szczawnica = makeMadkomCity({
  id: 'szczawnica',
  teryt: '1211024',
  label: 'Szczawnica',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Szczawnica',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigszczawnica',
});

export default szczawnica;
