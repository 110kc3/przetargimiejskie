import { makeMadkomCity } from '../../core/madkom-bip.js';

export const aleksandrowLodzki = makeMadkomCity({
  id: 'aleksandrow-lodzki',
  teryt: '1020044',
  label: 'Aleksandrów Łódzki',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Aleksandrów Łódzki',
  host: 'bip.aleksandrow-lodzki.pl',
  origin: 'https://bip.aleksandrow-lodzki.pl',
  context: 'default',
});

export default aleksandrowLodzki;
