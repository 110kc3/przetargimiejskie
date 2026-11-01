import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const stepnica = makeSystemDoBipCity({
  id: 'stepnica',
  teryt: '3204074',
  label: 'Stepnica',
  voivodeship: 'zachodniopomorskie',
  authority: 'Prezydent Miasta Stepnica',
  host: 'bip.stepnica.pl',
  origin: 'https://bip.stepnica.pl',
  boardId: 361,
});

export default stepnica;
