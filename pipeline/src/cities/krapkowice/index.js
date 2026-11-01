import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const krapkowice = makeSystemDoBipCity({
  id: 'krapkowice',
  teryt: '1605024',
  label: 'Krapkowice',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Krapkowice',
  host: 'bip.krapkowice.pl',
  origin: 'https://bip.krapkowice.pl',
  boardId: 361,
});

export default krapkowice;
