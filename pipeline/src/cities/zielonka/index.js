import { makeMadkomCity } from '../../core/madkom-bip.js';

export const zielonka = makeMadkomCity({
  id: 'zielonka',
  teryt: '1434041',
  label: 'Zielonka',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Miasta Zielonka',
  host: 'bip.zielonka.pl',
  origin: 'https://bip.zielonka.pl',
  context: 'default',
});

export default zielonka;
