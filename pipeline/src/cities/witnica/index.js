import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const witnica = makeSystemDoBipCity({
  id: 'witnica',
  teryt: '0801074',
  label: 'Witnica',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Witnica',
  host: 'bip.witnica.pl',
  origin: 'https://bip.witnica.pl',
  boardId: 361,
});

export default witnica;
