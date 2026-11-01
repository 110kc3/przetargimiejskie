import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const recz = makeSystemDoBipCity({
  id: 'recz',
  teryt: '3202064',
  label: 'Recz',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Recz',
  host: 'bip.recz.pl',
  origin: 'https://bip.recz.pl',
  boardId: 361,
});

export default recz;
