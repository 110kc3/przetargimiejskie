import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const debno = makeSystemDoBipCity({
  id: 'debno',
  teryt: '3210034',
  label: 'Dębno',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Dębno',
  host: 'bip.debno.pl',
  origin: 'https://bip.debno.pl',
  boardId: 361,
});

export default debno;
