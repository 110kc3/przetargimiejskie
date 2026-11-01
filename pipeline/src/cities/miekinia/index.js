import { makeMadkomCity } from '../../core/madkom-bip.js';

export const miekinia = makeMadkomCity({
  id: 'miekinia',
  teryt: '0218034',
  label: 'Miękinia',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Miękinia',
  host: 'bip.miekinia.pl',
  origin: 'https://bip.miekinia.pl',
  context: 'default',
});

export default miekinia;
