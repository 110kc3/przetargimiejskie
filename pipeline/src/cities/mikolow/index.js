import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const mikolow = makeSystemDoBipCity({
  id: 'mikolow',
  teryt: '2408021',
  label: 'Mikołów',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Miasta Mikołów',
  host: 'bip.mikolow.eu',
  origin: 'https://bip.mikolow.eu',
  boardId: 361,
});

export default mikolow;
