import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const proszkow = makeSystemDoBipCity({
  id: 'proszkow',
  teryt: '1609104',
  label: 'Prószków',
  voivodeship: 'opolskie',
  authority: 'Prezydent Miasta Prószków',
  host: 'bip.proszkow.pl',
  origin: 'https://bip.proszkow.pl',
  boardId: 361,
});

export default proszkow;
