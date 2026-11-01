import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const tulowice = makeSystemDoBipCity({
  id: 'tulowice',
  teryt: '1609124',
  label: 'Tułowice',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Tułowice',
  host: 'bip.tulowice.pl',
  origin: 'https://bip.tulowice.pl',
  boardId: 361,
});

export default tulowice;
