import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const tarnogrod = makeBipLubelskieCity({
  id: 'tarnogrod',
  teryt: '0602124',
  label: 'Tarnogród',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Tarnogród',
  host: 'umtarnogrod.bip.lubelskie.pl',
  origin: 'https://umtarnogrod.bip.lubelskie.pl',
  menuId: 413,
});

export default tarnogrod;
