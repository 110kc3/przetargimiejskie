import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const stoczekLukowski = makeBipLubelskieCity({
  id: 'stoczek-lukowski',
  teryt: '0611021',
  label: 'Stoczek Łukowski',
  voivodeship: 'lubelskie',
  authority: 'Burmistrz Miasta Stoczek Łukowski',
  host: 'ugstoczeklukowski.bip.lubelskie.pl',
  origin: 'https://ugstoczeklukowski.bip.lubelskie.pl',
  menuId: 413,
});

export default stoczekLukowski;
