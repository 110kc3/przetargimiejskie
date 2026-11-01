import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const strykow = makeSystemDoBipCity({
  id: 'strykow',
  teryt: '1020084',
  label: 'Stryków',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Stryków',
  host: 'bip.strykow.pl',
  origin: 'https://bip.strykow.pl',
  boardId: 361,
});

export default strykow;
