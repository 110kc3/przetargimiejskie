import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const rejowiec = makeBipLubelskieCity({
  id: 'rejowiec',
  teryt: '0603154',
  label: 'Rejowiec',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Rejowiec',
  host: 'ugrejowiec.bip.lubelskie.pl',
  origin: 'https://ugrejowiec.bip.lubelskie.pl',
  menuId: 413,
});

export default rejowiec;
