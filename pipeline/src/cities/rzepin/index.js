import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const rzepin = makeSystemDoBipCity({
  id: 'rzepin',
  teryt: '0805044',
  label: 'Rzepin',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Rzepin',
  host: 'bip.rzepin.pl',
  origin: 'https://bip.rzepin.pl',
  boardId: 361,
});

export default rzepin;
