import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kcynia = makeSystemDoBipCity({
  id: 'kcynia',
  teryt: '0410014',
  label: 'Kcynia',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Kcynia',
  host: 'bip.kcynia.pl',
  origin: 'https://bip.kcynia.pl',
  boardId: 361,
});

export default kcynia;
