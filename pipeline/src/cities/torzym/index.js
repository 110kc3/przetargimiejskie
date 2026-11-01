import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const torzym = makeSystemDoBipCity({
  id: 'torzym',
  teryt: '0807054',
  label: 'Torzym',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Torzym',
  host: 'bip.torzym.pl',
  origin: 'https://bip.torzym.pl',
  boardId: 361,
});

export default torzym;
