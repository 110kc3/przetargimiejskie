import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const poniatowa = makeBipLubelskieCity({
  id: 'poniatowa',
  teryt: '0612064',
  label: 'Poniatowa',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Poniatowa',
  host: 'umponiatowa.bip.lubelskie.pl',
  origin: 'https://umponiatowa.bip.lubelskie.pl',
  menuId: 413,
});

export default poniatowa;
