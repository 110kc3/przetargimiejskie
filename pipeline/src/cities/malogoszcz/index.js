import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const malogoszcz = makeBiuletynNetCity({
  id: 'malogoszcz',
  teryt: '2602034',
  name: 'Małogoszcz',
  label: 'Małogoszcz',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Małogoszcz',
  host: 'malogoszcz.biuletyn.net',
  origin: 'https://malogoszcz.biuletyn.net',
  defaultCid: 280,
});

export default malogoszcz;
