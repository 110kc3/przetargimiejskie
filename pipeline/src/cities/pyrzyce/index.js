import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const pyrzyce = makeSystemDoBipCity({
  id: 'pyrzyce',
  teryt: '3212054',
  label: 'Pyrzyce',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Pyrzyce',
  host: 'bip.pyrzyce.um.gov.pl',
  origin: 'https://bip.pyrzyce.um.gov.pl',
  boardId: 361,
});

export default pyrzyce;
