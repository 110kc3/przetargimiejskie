import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const ostrowLubelski = makeBipLubelskieCity({
  id: 'ostrow-lubelski',
  teryt: '0608104',
  label: 'Ostrów Lubelski',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Ostrów Lubelski',
  host: 'umigostrowlubelski.bip.lubelskie.pl',
  origin: 'https://umigostrowlubelski.bip.lubelskie.pl',
  menuId: 413,
});

export default ostrowLubelski;
