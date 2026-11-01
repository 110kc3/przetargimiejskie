import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const sierakow = makeSystemDoBipCity({
  id: 'sierakow',
  teryt: '3014044',
  label: 'Sieraków',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Sieraków',
  host: 'bip.sierakow.pl',
  origin: 'https://bip.sierakow.pl',
  boardId: 361,
});

export default sierakow;
