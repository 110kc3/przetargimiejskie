import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kozminek = makeSystemDoBipCity({
  id: 'kozminek',
  teryt: '3007054',
  label: 'Koźminek',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Koźminek',
  host: 'bip.kozminek.pl',
  origin: 'https://bip.kozminek.pl',
  boardId: 361,
});

export default kozminek;
