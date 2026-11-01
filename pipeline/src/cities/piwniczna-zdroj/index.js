import { makeMadkomCity } from '../../core/madkom-bip.js';

export const piwnicznaZdroj = makeMadkomCity({
  id: 'piwniczna-zdroj',
  teryt: '1210134',
  label: 'Piwniczna-Zdrój',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Piwniczna-Zdrój',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigpiwnicznazdroj',
});

export default piwnicznaZdroj;
