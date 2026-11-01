import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kowalewoPomorskie = makeSystemDoBipCity({
  id: 'kowalewo-pomorskie',
  teryt: '0405044',
  label: 'Kowalewo Pomorskie',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Kowalewo Pomorskie',
  host: 'bip.kowalewopomorskie.pl',
  origin: 'https://bip.kowalewopomorskie.pl',
  boardId: 361,
});

export default kowalewoPomorskie;
