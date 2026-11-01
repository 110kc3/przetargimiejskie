import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const klodawa = makeBiuletynNetCity({
  id: 'klodawa',
  teryt: '3009064',
  name: 'Kłodawa',
  label: 'Kłodawa',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Kłodawa',
  host: 'klodawa.biuletyn.net',
  origin: 'https://klodawa.biuletyn.net',
  defaultCid: 1133,
});

export default klodawa;
