import { makeMadkomCity } from '../../core/madkom-bip.js';

export const skala = makeMadkomCity({
  id: 'skala',
  teryt: '1206104',
  label: 'Skała',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Skała',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umigskala',
});

export default skala;
