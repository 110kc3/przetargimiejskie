import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const sobkow = makeBiuletynNetCity({
  id: 'sobkow',
  teryt: '2602084',
  name: 'Sobków',
  label: 'Sobków',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Sobków',
  host: 'sobkow.biuletyn.net',
  origin: 'https://sobkow.biuletyn.net',
  defaultCid: 201,
});

export default sobkow;
