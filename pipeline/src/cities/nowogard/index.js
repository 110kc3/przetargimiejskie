import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const nowogard = makeSystemDoBipCity({
  id: 'nowogard',
  teryt: '3204044',
  label: 'Nowogard',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Nowogard',
  host: 'bip.nowogard.pl',
  origin: 'https://bip.nowogard.pl',
  boardId: 361,
});

export default nowogard;
