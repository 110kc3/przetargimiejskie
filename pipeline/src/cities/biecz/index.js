import { makeMadkomCity } from '../../core/madkom-bip.js';

export const biecz = makeMadkomCity({
  id: 'biecz',
  teryt: '1205024',
  label: 'Biecz',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Biecz',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umbiecz',
});

export default biecz;
