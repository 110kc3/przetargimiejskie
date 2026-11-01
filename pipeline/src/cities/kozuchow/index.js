import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kozuchow = makeSystemDoBipCity({
  id: 'kozuchow',
  teryt: '0804044',
  label: 'Kożuchów',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Kożuchów',
  host: 'bip.kozuchow.pl',
  origin: 'https://bip.kozuchow.pl',
  boardId: 361,
});

export default kozuchow;
