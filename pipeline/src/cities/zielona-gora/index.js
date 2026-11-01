import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const zielonaGora = makeSystemDoBipCity({
  id: 'zielona-gora',
  teryt: '0862011',
  label: 'Zielona Góra',
  voivodeship: 'lubuskie',
  authority: 'Burmistrz Miasta Zielona Góra',
  host: 'bip.zielonagora.pl',
  origin: 'https://bip.zielonagora.pl',
  boardId: 361,
});

export default zielonaGora;
