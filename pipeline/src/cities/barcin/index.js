import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const barcin = makeSystemDoBipCity({
  id: 'barcin',
  teryt: '0419014',
  label: 'Barcin',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Miasta Barcin',
  host: 'bip.barcin.pl',
  origin: 'https://bip.barcin.pl',
  boardId: 361,
});

export default barcin;
