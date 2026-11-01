import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const tomaszowLubelski = makeBipLubelskieCity({
  id: 'tomaszow-lubelski',
  teryt: '0618011',
  label: 'Tomaszów Lubelski',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Tomaszów Lubelski',
  host: 'umtomaszowlubelski.bip.lubelskie.pl',
  origin: 'https://umtomaszowlubelski.bip.lubelskie.pl',
  menuId: 413,
});

export default tomaszowLubelski;
