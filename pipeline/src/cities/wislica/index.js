import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const wislica = makeSystemDoBipCity({
  id: 'wislica',
  teryt: '2601084',
  label: 'Wiślica',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Wiślica',
  host: 'bip.wislica.pl',
  origin: 'https://bip.wislica.pl',
  boardId: 361,
});

export default wislica;
