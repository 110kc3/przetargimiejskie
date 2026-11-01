import { makeMadkomCity } from '../../core/madkom-bip.js';

export const sulkowice = makeMadkomCity({
  id: 'sulkowice',
  teryt: '1209074',
  label: 'Sułkowice',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Sułkowice',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umsulkowice',
});

export default sulkowice;
