import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const rypin = makeSystemDoBipCity({
  id: 'rypin',
  teryt: '0412011',
  label: 'Rypin',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Burmistrz Miasta Rypin',
  host: 'bip.rypin.eu',
  origin: 'https://bip.rypin.eu',
  boardId: 361,
});

export default rypin;
