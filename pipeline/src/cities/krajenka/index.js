import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const krajenka = makeSystemDoBipCity({
  id: 'krajenka',
  teryt: '3031034',
  label: 'Krajenka',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Krajenka',
  host: 'bip.krajenka.pl',
  origin: 'https://bip.krajenka.pl',
  boardId: 361,
});

export default krajenka;
