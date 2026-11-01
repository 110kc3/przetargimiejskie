import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const dzialoszyn = makeSystemDoBipCity({
  id: 'dzialoszyn',
  teryt: '1009014',
  label: 'Działoszyn',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Działoszyn',
  host: 'bip.dzialoszyn.pl',
  origin: 'https://bip.dzialoszyn.pl',
  boardId: 361,
});

export default dzialoszyn;
