import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const brody = makeSystemDoBipCity({
  id: 'brody',
  teryt: '0811034',
  label: 'Brody',
  voivodeship: 'lubuskie',
  authority: 'Prezydent Miasta Brody',
  host: 'bip.brody.pl',
  origin: 'https://bip.brody.pl',
  boardId: 361,
});

export default brody;
