import { makeMadkomCity } from '../../core/madkom-bip.js';

export const nowyTomysl = makeMadkomCity({
  id: 'nowy-tomysl',
  teryt: '3015044',
  label: 'Nowy Tomyśl',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Nowy Tomyśl',
  host: 'bip.nowytomysl.pl',
  origin: 'https://bip.nowytomysl.pl',
  context: 'default',
});

export default nowyTomysl;
