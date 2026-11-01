import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const zlocieniec = makeSystemDoBipCity({
  id: 'zlocieniec',
  teryt: '3203064',
  label: 'Złocieniec',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Złocieniec',
  host: 'bip.zlocieniec.pl',
  origin: 'https://bip.zlocieniec.pl',
  boardId: 361,
});

export default zlocieniec;
