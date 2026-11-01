import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const krasnobrod = makeBipLubelskieCity({
  id: 'krasnobrod',
  teryt: '0620044',
  label: 'Krasnobród',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Krasnobród',
  host: 'umkrasnobrod.bip.lubelskie.pl',
  origin: 'https://umkrasnobrod.bip.lubelskie.pl',
  menuId: 413,
});

export default krasnobrod;
