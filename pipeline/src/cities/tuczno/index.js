import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const tuczno = makeSystemDoBipCity({
  id: 'tuczno',
  teryt: '3217044',
  label: 'Tuczno',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Tuczno',
  host: 'bip.tuczno.pl',
  origin: 'https://bip.tuczno.pl',
  boardId: 361,
});

export default tuczno;
