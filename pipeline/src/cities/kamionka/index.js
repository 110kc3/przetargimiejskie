import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const kamionka = makeBipLubelskieCity({
  id: 'kamionka',
  teryt: '0608054',
  label: 'Kamionka',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Kamionka',
  host: 'ugkamionka.bip.lubelskie.pl',
  origin: 'https://ugkamionka.bip.lubelskie.pl',
  menuId: 413,
});

export default kamionka;
