import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const leknica = makeSystemDoBipCity({
  id: 'leknica',
  teryt: '0811011',
  label: 'Łęknica',
  voivodeship: 'lubuskie',
  authority: 'Burmistrz Miasta Łęknica',
  host: 'bip.umleknica.pl',
  origin: 'https://bip.umleknica.pl',
  boardId: 361,
});

export default leknica;
