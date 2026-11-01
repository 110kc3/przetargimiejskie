import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const mysliborz = makeSystemDoBipCity({
  id: 'mysliborz',
  teryt: '3210044',
  label: 'Myślibórz',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Myślibórz',
  host: 'bip.mysliborz.pl',
  origin: 'https://bip.mysliborz.pl',
  boardId: 361,
});

export default mysliborz;
