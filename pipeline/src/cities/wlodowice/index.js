import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const wlodowice = makeSystemDoBipCity({
  id: 'wlodowice',
  teryt: '2416094',
  label: 'Włodowice',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Włodowice',
  host: 'bip.wlodowice.pl',
  origin: 'https://bip.wlodowice.pl',
  boardId: 361,
});

export default wlodowice;
