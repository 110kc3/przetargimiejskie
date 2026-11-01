import { makeMadkomCity } from '../../core/madkom-bip.js';

export const tuchow = makeMadkomCity({
  id: 'tuchow',
  teryt: '1216104',
  label: 'Tuchów',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Tuchów',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umtuchow',
});

export default tuchow;
