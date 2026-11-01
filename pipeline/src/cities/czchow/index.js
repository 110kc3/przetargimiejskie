import { makeMadkomCity } from '../../core/madkom-bip.js';

export const czchow = makeMadkomCity({
  id: 'czchow',
  teryt: '1202034',
  label: 'Czchów',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Czchów',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'czchow',
});

export default czchow;
