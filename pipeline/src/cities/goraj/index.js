import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const goraj = makeBipLubelskieCity({
  id: 'goraj',
  teryt: '0602064',
  label: 'Goraj',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Goraj',
  host: 'uggoraj.bip.lubelskie.pl',
  origin: 'https://uggoraj.bip.lubelskie.pl',
  menuId: 413,
});

export default goraj;
