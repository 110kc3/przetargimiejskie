import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const lipsk = makeSmartSiteCity({
  id: 'lipsk',
  teryt: '2001044',
  name: 'Lipsk',
  label: 'Lipsk',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Lipsk',
  host: 'bip-umlipsk.podlaskie.eu',
  origin: 'https://bip-umlipsk.podlaskie.eu',
});

export default lipsk;
