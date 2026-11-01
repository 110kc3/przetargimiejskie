import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const nowe = makeSystemDoBipCity({
  id: 'nowe',
  teryt: '0414064',
  label: 'Nowe',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Nowe',
  host: 'bip.gminanowe.pl',
  origin: 'https://bip.gminanowe.pl',
  boardId: 361,
});

export default nowe;
