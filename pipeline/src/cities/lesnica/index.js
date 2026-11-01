import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const lesnica = makeSystemDoBipCity({
  id: 'lesnica',
  teryt: '1611044',
  label: 'Leśnica',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Leśnica',
  host: 'bip.lesnica.pl',
  origin: 'https://bip.lesnica.pl',
  boardId: 361,
});

export default lesnica;
