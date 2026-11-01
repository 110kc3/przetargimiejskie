import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const tyszowce = makeBipLubelskieCity({
  id: 'tyszowce',
  teryt: '0618124',
  label: 'Tyszowce',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Tyszowce',
  host: 'umtyszowce.bip.lubelskie.pl',
  origin: 'https://umtyszowce.bip.lubelskie.pl',
  menuId: 413,
});

export default tyszowce;
