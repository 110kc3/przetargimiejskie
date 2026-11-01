import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const hrubieszow = makeBipLubelskieCity({
  id: 'hrubieszow',
  teryt: '0604011',
  label: 'Hrubieszów',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Hrubieszów',
  host: 'umhrubieszow.bip.lubelskie.pl',
  origin: 'https://umhrubieszow.bip.lubelskie.pl',
  menuId: 413,
});

export default hrubieszow;
