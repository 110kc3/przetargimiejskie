import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const skwierzyna = makeSystemDoBipCity({
  id: 'skwierzyna',
  teryt: '0803054',
  label: 'Skwierzyna',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Skwierzyna',
  host: 'bip.skwierzyna.pl',
  origin: 'https://bip.skwierzyna.pl',
  boardId: 361,
});

export default skwierzyna;
