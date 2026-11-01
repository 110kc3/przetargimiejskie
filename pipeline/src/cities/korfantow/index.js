import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const korfantow = makeSystemDoBipCity({
  id: 'korfantow',
  teryt: '1607034',
  label: 'Korfantów',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Korfantów',
  host: 'bip.korfantow.pl',
  origin: 'https://bip.korfantow.pl',
  boardId: 361,
});

export default korfantow;
