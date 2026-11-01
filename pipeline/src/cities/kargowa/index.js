import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kargowa = makeSystemDoBipCity({
  id: 'kargowa',
  teryt: '0809044',
  label: 'Kargowa',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Kargowa',
  host: 'bip.kargowa.pl',
  origin: 'https://bip.kargowa.pl',
  boardId: 361,
});

export default kargowa;
