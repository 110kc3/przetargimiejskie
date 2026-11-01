import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const otyn = makeSystemDoBipCity({
  id: 'otyn',
  teryt: '0804074',
  label: 'Otyń',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Otyń',
  host: 'bip.otyn.pl',
  origin: 'https://bip.otyn.pl',
  boardId: 361,
});

export default otyn;
