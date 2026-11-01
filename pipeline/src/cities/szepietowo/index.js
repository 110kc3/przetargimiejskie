import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const szepietowo = makeBiuletynNetCity({
  id: 'szepietowo',
  teryt: '2013094',
  name: 'Szepietowo',
  label: 'Szepietowo',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Szepietowo',
  host: 'szepietowo.biuletyn.net',
  origin: 'https://szepietowo.biuletyn.net',
  defaultCid: 70,
});

export default szepietowo;
