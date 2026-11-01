import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const pelczyce = makeSystemDoBipCity({
  id: 'pelczyce',
  teryt: '3202054',
  label: 'Pełczyce',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Pełczyce',
  host: 'bip.pelczyce.pl',
  origin: 'https://bip.pelczyce.pl',
  boardId: 361,
});

export default pelczyce;
