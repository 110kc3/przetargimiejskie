import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const turobin = makeBipLubelskieCity({
  id: 'turobin',
  teryt: '0602144',
  label: 'Turobin',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Turobin',
  host: 'ugturobin.bip.lubelskie.pl',
  origin: 'https://ugturobin.bip.lubelskie.pl',
  menuId: 413,
});

export default turobin;
