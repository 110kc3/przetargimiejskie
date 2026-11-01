import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const terespol = makeBipLubelskieCity({
  id: 'terespol',
  teryt: '0601021',
  label: 'Terespol',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Terespol',
  host: 'ugterespol.bip.lubelskie.pl',
  origin: 'https://ugterespol.bip.lubelskie.pl',
  menuId: 413,
});

export default terespol;
