import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const turek = makeSystemDoBipCity({
  id: 'turek',
  teryt: '3027011',
  label: 'Turek',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Turek',
  host: 'bip.miastoturek.pl',
  origin: 'https://bip.miastoturek.pl',
  boardId: 361,
});

export default turek;
