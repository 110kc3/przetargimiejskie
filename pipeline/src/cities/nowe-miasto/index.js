import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const noweMiasto = makeSystemDoBipCity({
  id: 'nowe-miasto',
  teryt: '1420084',
  label: 'Nowe Miasto',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Nowe Miasto',
  host: 'bip.umnowemiasto.pl',
  origin: 'https://bip.umnowemiasto.pl',
  boardId: 361,
});

export default noweMiasto;
