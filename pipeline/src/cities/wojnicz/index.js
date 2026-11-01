import { makeMadkomCity } from '../../core/madkom-bip.js';

export const wojnicz = makeMadkomCity({
  id: 'wojnicz',
  teryt: '1216134',
  label: 'Wojnicz',
  voivodeship: 'malopolskie',
  authority: 'Prezydent Miasta Wojnicz',
  host: 'bip.malopolska.pl',
  origin: 'https://bip.malopolska.pl',
  context: 'umwojnicz',
});

export default wojnicz;
