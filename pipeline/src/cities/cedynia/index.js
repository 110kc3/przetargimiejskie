import { makeMadkomCity } from '../../core/madkom-bip.js';

export const cedynia = makeMadkomCity({
  id: 'cedynia',
  teryt: '3206024',
  label: 'Cedynia',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Cedynia',
  host: 'bip.cedynia.pl',
  origin: 'https://bip.cedynia.pl',
  context: 'default',
});

export default cedynia;
