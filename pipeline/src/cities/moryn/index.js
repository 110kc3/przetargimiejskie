import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const moryn = makeSystemDoBipCity({
  id: 'moryn',
  teryt: '3206064',
  label: 'Moryń',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Moryń',
  host: 'bip.moryn.pl',
  origin: 'https://bip.moryn.pl',
  boardId: 361,
});

export default moryn;
