import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const ryki = makeBipLubelskieCity({
  id: 'ryki',
  teryt: '0616044',
  label: 'Ryki',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Ryki',
  host: 'umryki.bip.lubelskie.pl',
  origin: 'https://umryki.bip.lubelskie.pl',
  menuId: 413,
});

export default ryki;
