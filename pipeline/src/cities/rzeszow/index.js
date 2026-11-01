import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const rzeszow = makeSystemDoBipCity({
  id: 'rzeszow',
  teryt: '1863011',
  label: 'Rzeszów',
  voivodeship: 'podkarpackie',
  authority: 'Burmistrz Miasta Rzeszów',
  host: 'bip.erzeszow.pl',
  origin: 'https://bip.erzeszow.pl',
  boardId: 361,
});

export default rzeszow;
