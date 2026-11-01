import { makeMadkomCity } from '../../core/madkom-bip.js';

export const brzeszcze = makeMadkomCity({
  id: 'brzeszcze',
  teryt: '1213024',
  label: 'Brzeszcze',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Brzeszcze',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'ugbrzeszcze',
});

export default brzeszcze;
