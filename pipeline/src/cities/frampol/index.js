import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const frampol = makeBipLubelskieCity({
  id: 'frampol',
  teryt: '0602054',
  label: 'Frampol',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Frampol',
  host: 'umframpol.bip.lubelskie.pl',
  origin: 'https://umframpol.bip.lubelskie.pl',
  menuId: 413,
});

export default frampol;
