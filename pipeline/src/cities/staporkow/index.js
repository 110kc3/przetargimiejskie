import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const staporkow = makeSystemDoBipCity({
  id: 'staporkow',
  teryt: '2605084',
  label: 'Stąporków',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Stąporków',
  host: 'bip.staporkow.pl',
  origin: 'https://bip.staporkow.pl',
  boardId: 361,
});

export default staporkow;
