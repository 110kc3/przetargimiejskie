import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const czemierniki = makeBipLubelskieCity({
  id: 'czemierniki',
  teryt: '0615034',
  label: 'Czemierniki',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Czemierniki',
  host: 'ugczemierniki.bip.lubelskie.pl',
  origin: 'https://ugczemierniki.bip.lubelskie.pl',
  menuId: 413,
});

export default czemierniki;
