import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const baborow = makeSystemDoBipCity({
  id: 'baborow',
  teryt: '1602014',
  label: 'Baborów',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Baborów',
  host: 'bip.baborow.pl',
  origin: 'https://bip.baborow.pl',
  boardId: 361,
});

export default baborow;
