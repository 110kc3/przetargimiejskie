import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const miedzyzdroje = makeSystemDoBipCity({
  id: 'miedzyzdroje',
  teryt: '3207044',
  label: 'Międzyzdroje',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Międzyzdroje',
  host: 'bip.miedzyzdroje.pl',
  origin: 'https://bip.miedzyzdroje.pl',
  boardId: 361,
});

export default miedzyzdroje;
