import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const pulawy = makeBipLubelskieCity({
  id: 'pulawy',
  teryt: '0614011',
  label: 'Puławy',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Puławy',
  host: 'www.pulawy.eu',
  origin: 'https://www.pulawy.eu',
  menuId: 413,
});

export default pulawy;
