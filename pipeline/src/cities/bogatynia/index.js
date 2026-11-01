import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const bogatynia = makeSystemDoBipCity({
  id: 'bogatynia',
  teryt: '0225034',
  label: 'Bogatynia',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Bogatynia',
  host: 'bip.bogatynia.pl',
  origin: 'https://bip.bogatynia.pl',
  boardId: 361,
});

export default bogatynia;
