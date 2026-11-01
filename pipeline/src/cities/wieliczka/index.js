import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const wieliczka = makeSystemDoBipCity({
  id: 'wieliczka',
  teryt: '1219054',
  label: 'Wieliczka',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Wieliczka',
  host: 'www.wieliczka.eu',
  origin: 'https://www.wieliczka.eu',
  boardId: 361,
});

export default wieliczka;
