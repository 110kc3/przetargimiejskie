import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const sobotka = makeSystemDoBipCity({
  id: 'sobotka',
  teryt: '0223074',
  label: 'Sobótka',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Sobótka',
  host: 'bip.sobotka.pl',
  origin: 'https://bip.sobotka.pl',
  boardId: 361,
});

export default sobotka;
