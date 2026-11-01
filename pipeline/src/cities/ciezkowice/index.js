import { makeMadkomCity } from '../../core/madkom-bip.js';

export const ciezkowice = makeMadkomCity({
  id: 'ciezkowice',
  teryt: '1216014',
  label: 'Ciężkowice',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Ciężkowice',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'ugciezkowice',
});

export default ciezkowice;
