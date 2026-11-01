import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const piaski = makeBipLubelskieCity({
  id: 'piaski',
  teryt: '0617034',
  label: 'Piaski',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Piaski',
  host: 'umpiaski.bip.lubelskie.pl',
  origin: 'https://umpiaski.bip.lubelskie.pl',
  menuId: 413,
});

export default piaski;
