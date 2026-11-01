import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const zdzieszowice = makeSystemDoBipCity({
  id: 'zdzieszowice',
  teryt: '1605054',
  label: 'Zdzieszowice',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Zdzieszowice',
  host: 'bip.zdzieszowice.pl',
  origin: 'https://bip.zdzieszowice.pl',
  boardId: 361,
});

export default zdzieszowice;
