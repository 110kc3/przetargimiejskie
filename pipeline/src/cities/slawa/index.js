import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const slawa = makeSystemDoBipCity({
  id: 'slawa',
  teryt: '0812014',
  label: 'Sława',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Sława',
  host: 'bip.slawa.pl',
  origin: 'https://bip.slawa.pl',
  boardId: 361,
});

export default slawa;
