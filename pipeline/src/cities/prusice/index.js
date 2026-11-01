import { makeMadkomCity } from '../../core/madkom-bip.js';

export const prusice = makeMadkomCity({
  id: 'prusice',
  teryt: '0220024',
  label: 'Prusice',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Prusice',
  host: 'bip.prusice.pl',
  origin: 'https://bip.prusice.pl',
  context: 'default',
});

export default prusice;
