import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const chojna = makeSystemDoBipCity({
  id: 'chojna',
  teryt: '3206034',
  label: 'Chojna',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Chojna',
  host: 'bip.chojna.pl',
  origin: 'https://bip.chojna.pl',
  boardId: 361,
});

export default chojna;
