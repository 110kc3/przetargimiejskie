import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const bychawa = makeBipLubelskieCity({
  id: 'bychawa',
  teryt: '0609034',
  label: 'Bychawa',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Bychawa',
  host: 'umbychawa.bip.lubelskie.pl',
  origin: 'https://umbychawa.bip.lubelskie.pl',
  menuId: 413,
});

export default bychawa;
