import { makeMadkomCity } from '../../core/madkom-bip.js';

export const nowyWisnicz = makeMadkomCity({
  id: 'nowy-wisnicz',
  teryt: '1201064',
  label: 'Nowy Wiśnicz',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Nowy Wiśnicz',
  host: 'bip.nowywisnicz.pl',
  origin: 'https://bip.nowywisnicz.pl',
  context: 'default',
});

export default nowyWisnicz;
