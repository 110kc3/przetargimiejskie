import { makeMadkomCity } from '../../core/madkom-bip.js';

export const jelczLaskowice = makeMadkomCity({
  id: 'jelcz-laskowice',
  teryt: '0215034',
  label: 'Jelcz-Laskowice',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Jelcz-Laskowice',
  host: 'bip.jelcz-laskowice.pl',
  origin: 'https://bip.jelcz-laskowice.pl',
  context: 'default',
});

export default jelczLaskowice;
