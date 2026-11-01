import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const brzescKujawski = makeSystemDoBipCity({
  id: 'brzesc-kujawski',
  teryt: '0418044',
  label: 'Brześć Kujawski',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Brześć Kujawski',
  host: 'bip.brzesckujawski.pl',
  origin: 'https://bip.brzesckujawski.pl',
  boardId: 361,
});

export default brzescKujawski;
