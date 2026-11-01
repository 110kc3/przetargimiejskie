import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const bransk = makeSystemDoBipCity({
  id: 'bransk',
  teryt: '2003021',
  label: 'Brańsk',
  voivodeship: 'podlaskie',
  authority: 'Burmistrz Miasta Brańsk',
  host: 'bip.bransk.pl',
  origin: 'https://bip.bransk.pl',
  boardId: 361,
});

export default bransk;
