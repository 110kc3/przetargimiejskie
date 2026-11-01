import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const cmielow = makeSystemDoBipCity({
  id: 'cmielow',
  teryt: '2607044',
  label: 'Ćmielów',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Ćmielów',
  host: 'bip.cmielow.pl',
  origin: 'https://bip.cmielow.pl',
  boardId: 361,
});

export default cmielow;
