import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const lubsko = makeSystemDoBipCity({
  id: 'lubsko',
  teryt: '0811064',
  label: 'Lubsko',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Lubsko',
  host: 'bip.lubsko.pl',
  origin: 'https://bip.lubsko.pl',
  boardId: 361,
});

export default lubsko;
