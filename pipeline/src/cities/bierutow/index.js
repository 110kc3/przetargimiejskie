import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const bierutow = makeBiuletynNetCity({
  id: 'bierutow',
  teryt: '0214024',
  name: 'Bierutów',
  label: 'Bierutów',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Bierutów',
  host: 'bip.bierutow.pl',
  origin: 'https://bip.bierutow.pl',
  defaultCid: 126,
});

export default bierutow;
