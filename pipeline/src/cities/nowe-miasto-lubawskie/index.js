import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const noweMiastoLubawskie = makeSystemDoBipCity({
  id: 'nowe-miasto-lubawskie',
  teryt: '2812011',
  label: 'Nowe Miasto Lubawskie',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Miasta Nowe Miasto Lubawskie',
  host: 'bip.umnowemiasto.pl',
  origin: 'https://bip.umnowemiasto.pl',
  boardId: 361,
});

export default noweMiastoLubawskie;
