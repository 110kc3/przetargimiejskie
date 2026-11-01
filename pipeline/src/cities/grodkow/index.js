import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const grodkow = makeSystemDoBipCity({
  id: 'grodkow',
  teryt: '1601034',
  label: 'Grodków',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Grodków',
  host: 'bip.grodkow.pl',
  origin: 'https://bip.grodkow.pl',
  boardId: 361,
});

export default grodkow;
