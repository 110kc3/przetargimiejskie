import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const lukow = makeBipLubelskieCity({
  id: 'lukow',
  teryt: '0611011',
  label: 'Łuków',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Łuków',
  host: 'umlukow.bip.lubelskie.pl',
  origin: 'https://umlukow.bip.lubelskie.pl',
  menuId: 413,
});

export default lukow;
