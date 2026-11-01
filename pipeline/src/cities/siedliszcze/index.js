import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const siedliszcze = makeBipLubelskieCity({
  id: 'siedliszcze',
  teryt: '0603114',
  label: 'Siedliszcze',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Siedliszcze',
  host: 'ugsiedliszcze.bip.lubelskie.pl',
  origin: 'https://ugsiedliszcze.bip.lubelskie.pl',
  menuId: 413,
});

export default siedliszcze;
