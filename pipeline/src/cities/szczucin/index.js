import { makeMadkomCity } from '../../core/madkom-bip.js';

export const szczucin = makeMadkomCity({
  id: 'szczucin',
  teryt: '1204074',
  label: 'Szczucin',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Szczucin',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigszczucin',
});

export default szczucin;
