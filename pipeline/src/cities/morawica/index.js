import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const morawica = makeBiuletynNetCity({
  id: 'morawica',
  teryt: '2604124',
  name: 'Morawica',
  label: 'Morawica',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Morawica',
  host: 'morawica.biuletyn.net',
  origin: 'https://morawica.biuletyn.net',
  defaultCid: 70,
});

export default morawica;
