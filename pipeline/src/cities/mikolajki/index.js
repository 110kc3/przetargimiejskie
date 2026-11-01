import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const mikolajki = makeSystemDoBipCity({
  id: 'mikolajki',
  teryt: '2810024',
  label: 'Mikołajki',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Prezydent Miasta Mikołajki',
  host: 'bip.mikolajki.pl',
  origin: 'https://bip.mikolajki.pl',
  boardId: 361,
});

export default mikolajki;
