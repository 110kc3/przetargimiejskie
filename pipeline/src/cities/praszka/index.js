import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const praszka = makeSystemDoBipCity({
  id: 'praszka',
  teryt: '1608044',
  label: 'Praszka',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Praszka',
  host: 'bip.praszka.pl',
  origin: 'https://bip.praszka.pl',
  boardId: 361,
});

export default praszka;
