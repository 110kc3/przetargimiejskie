import { makeMadkomCity } from '../../core/madkom-bip.js';

export const rumia = makeMadkomCity({
  id: 'rumia',
  teryt: '2215021',
  label: 'Rumia',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Rumia',
  host: 'bip.rumia.pl',
  origin: 'https://bip.rumia.pl',
  context: 'default',
  menuIds: ['799'],
});

export default rumia;
