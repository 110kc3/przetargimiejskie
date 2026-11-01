import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const dobrodzien = makeSystemDoBipCity({
  id: 'dobrodzien',
  teryt: '1608014',
  label: 'Dobrodzień',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Dobrodzień',
  host: 'bip.dobrodzien.pl',
  origin: 'https://bip.dobrodzien.pl',
  boardId: 361,
});

export default dobrodzien;
