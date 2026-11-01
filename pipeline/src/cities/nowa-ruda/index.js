import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const nowaRuda = makeBiuletynNetCity({
  id: 'nowa-ruda',
  teryt: '0208041',
  name: 'Nowa Ruda',
  label: 'Nowa Ruda',
  voivodeship: 'dolnoslaskie',
  authority: 'Burmistrz Miasta Nowa Ruda',
  host: 'nowaruda.biuletyn.net',
  origin: 'https://nowaruda.biuletyn.net',
  defaultCid: 159,
});

export default nowaRuda;
