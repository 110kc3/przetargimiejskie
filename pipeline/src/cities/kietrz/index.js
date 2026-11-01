import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kietrz = makeSystemDoBipCity({
  id: 'kietrz',
  teryt: '1602044',
  label: 'Kietrz',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Kietrz',
  host: 'bip.kietrz.pl',
  origin: 'https://bip.kietrz.pl',
  boardId: 361,
});

export default kietrz;
