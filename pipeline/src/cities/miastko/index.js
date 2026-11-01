import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const miastko = makeSystemDoBipCity({
  id: 'miastko',
  teryt: '2201064',
  label: 'Miastko',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Miastko',
  host: 'bip.miastko.pl',
  origin: 'https://bip.miastko.pl',
  boardId: 361,
});

export default miastko;
