import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const urzedow = makeBipLubelskieCity({
  id: 'urzedow',
  teryt: '0607084',
  label: 'Urzędów',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Urzędów',
  host: 'ugurzedow.bip.lubelskie.pl',
  origin: 'https://ugurzedow.bip.lubelskie.pl',
  menuId: 413,
});

export default urzedow;
