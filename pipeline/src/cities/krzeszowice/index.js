import { makeMadkomCity } from '../../core/madkom-bip.js';

export const krzeszowice = makeMadkomCity({
  id: 'krzeszowice',
  teryt: '1206064',
  label: 'Krzeszowice',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Krzeszowice',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umkrzeszowice',
});

export default krzeszowice;
