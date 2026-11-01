import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const opoleLubelskie = makeBipLubelskieCity({
  id: 'opole-lubelskie',
  teryt: '0612054',
  label: 'Opole Lubelskie',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Opole Lubelskie',
  host: 'umopolelubelskie.bip.lubelskie.pl',
  origin: 'https://umopolelubelskie.bip.lubelskie.pl',
  menuId: 413,
});

export default opoleLubelskie;
