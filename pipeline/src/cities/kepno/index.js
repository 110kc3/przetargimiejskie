import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kepno = makeSystemDoBipCity({
  id: 'kepno',
  teryt: '3008034',
  label: 'Kępno',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Kępno',
  host: 'bip.kepno.pl',
  origin: 'https://bip.kepno.pl',
  boardId: 361,
});

export default kepno;
