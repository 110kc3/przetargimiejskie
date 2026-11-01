import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const noweMiasteczko = makeSystemDoBipCity({
  id: 'nowe-miasteczko',
  teryt: '0804064',
  label: 'Nowe Miasteczko',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Nowe Miasteczko',
  host: 'bip.nowemiasteczko.pl',
  origin: 'https://bip.nowemiasteczko.pl',
  boardId: 361,
});

export default noweMiasteczko;
