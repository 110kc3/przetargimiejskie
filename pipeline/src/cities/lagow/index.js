import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const lagow = makeSystemDoBipCity({
  id: 'lagow',
  teryt: '2604074',
  label: 'Łagów',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Łagów',
  host: 'bip.lagow.pl',
  origin: 'https://bip.lagow.pl',
  boardId: 361,
});

export default lagow;
