import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const bogoria = makeBiuletynNetCity({
  id: 'bogoria',
  teryt: '2612014',
  name: 'Bogoria',
  label: 'Bogoria',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Bogoria',
  host: 'bogoria.biuletyn.net',
  origin: 'https://bogoria.biuletyn.net',
  defaultCid: 70,
});

export default bogoria;
