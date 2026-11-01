import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const leczna = makeBipLubelskieCity({
  id: 'leczna',
  teryt: '0610034',
  label: 'Łęczna',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Łęczna',
  host: 'leczna.pl',
  origin: 'https://leczna.pl',
  menuId: 413,
});

export default leczna;
