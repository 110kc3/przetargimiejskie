import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const trzcinskoZdroj = makeSystemDoBipCity({
  id: 'trzcinsko-zdroj',
  teryt: '3206084',
  label: 'Trzcińsko-Zdrój',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Trzcińsko-Zdrój',
  host: 'bip.trzcinsko-zdroj.pl',
  origin: 'https://bip.trzcinsko-zdroj.pl',
  boardId: 361,
});

export default trzcinskoZdroj;
