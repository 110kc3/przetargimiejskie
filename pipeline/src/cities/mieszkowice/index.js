import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const mieszkowice = makeSystemDoBipCity({
  id: 'mieszkowice',
  teryt: '3206054',
  label: 'Mieszkowice',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Mieszkowice',
  host: 'bip.mieszkowice.pl',
  origin: 'https://bip.mieszkowice.pl',
  boardId: 361,
});

export default mieszkowice;
