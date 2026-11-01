import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const wolin = makeSystemDoBipCity({
  id: 'wolin',
  teryt: '3207064',
  label: 'Wolin',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Wolin',
  host: 'bip.gminawolin.pl',
  origin: 'https://bip.gminawolin.pl',
  boardId: 361,
});

export default wolin;
