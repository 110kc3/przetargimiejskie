import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const lipiany = makeSystemDoBipCity({
  id: 'lipiany',
  teryt: '3212034',
  label: 'Lipiany',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Lipiany',
  host: 'bip.lipiany.pl',
  origin: 'https://bip.lipiany.pl',
  boardId: 361,
});

export default lipiany;
