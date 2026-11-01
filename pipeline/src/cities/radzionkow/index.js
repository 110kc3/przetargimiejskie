import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const radzionkow = makeSystemDoBipCity({
  id: 'radzionkow',
  teryt: '2413031',
  label: 'Radzionków',
  voivodeship: 'slaskie',
  authority: 'Burmistrz Miasta Radzionków',
  host: 'bip.radzionkow.pl',
  origin: 'https://bip.radzionkow.pl',
  boardId: 361,
});

export default radzionkow;
