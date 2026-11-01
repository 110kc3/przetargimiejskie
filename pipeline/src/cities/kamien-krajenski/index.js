import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const kamienKrajenski = makeSystemDoBipCity({
  id: 'kamien-krajenski',
  teryt: '0413014',
  label: 'Kamień Krajeński',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Kamień Krajeński',
  host: 'bip.kamienkrajenski.pl',
  origin: 'https://bip.kamienkrajenski.pl',
  boardId: 361,
});

export default kamienKrajenski;
