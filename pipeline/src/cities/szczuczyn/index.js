import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const szczuczyn = makeSmartSiteCity({
  id: 'szczuczyn',
  teryt: '2004054',
  name: 'Szczuczyn',
  label: 'Szczuczyn',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Szczuczyn',
  host: 'bip-umszczuczyn.podlaskie.eu',
  origin: 'https://bip-umszczuczyn.podlaskie.eu',
});

export default szczuczyn;
