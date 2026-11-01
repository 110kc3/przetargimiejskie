import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const kazimierzDolny = makeBipLubelskieCity({
  id: 'kazimierz-dolny',
  teryt: '0614044',
  label: 'Kazimierz Dolny',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Kazimierz Dolny',
  host: 'umkazimierzdolny.bip.lubelskie.pl',
  origin: 'https://umkazimierzdolny.bip.lubelskie.pl',
  menuId: 413,
});

export default kazimierzDolny;
