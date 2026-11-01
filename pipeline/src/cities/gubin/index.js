import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const gubin = makeSystemDoBipCity({
  id: 'gubin',
  teryt: '0802011',
  label: 'Gubin',
  voivodeship: 'lubuskie',
  authority: 'Burmistrz Miasta Gubin',
  host: 'bip.gubin.pl',
  origin: 'https://bip.gubin.pl',
  boardId: 361,
});

export default gubin;
